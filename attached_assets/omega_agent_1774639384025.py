#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OMEGA AI AGENT v1.0 - ÇALIŞAN VERSİYON
======================================
API'siz, Ücretsiz, Replit Uyumlu

Özellikler:
- Web'de araştırma yapar
- Görsel üretir (ücretsiz)
- Kod yazar ve çalıştırır
- Multi-agent sistemi (kendini böler)
- Hafıza sistemi

Gereksinimler:
pip install requests beautifulsoup4 duckduckgo-search Pillow
"""

import os
import sys
import json
import time
import re
import subprocess
import tempfile
import threading
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
import urllib.request
import urllib.parse

# Web scraping için
try:
    import requests
    from bs4 import BeautifulSoup
    WEB_SCRAPING_AVAILABLE = True
except ImportError:
    WEB_SCRAPING_AVAILABLE = False
    print("⚠️  Web scraping için: pip install requests beautifulsoup4")

# Arama için
try:
    from duckduckgo_search import DDGS
    SEARCH_AVAILABLE = True
except ImportError:
    SEARCH_AVAILABLE = False
    print("⚠️  Arama için: pip install duckduckgo-search")

# Görsel için
try:
    from PIL import Image, ImageDraw, ImageFont
    IMAGE_AVAILABLE = True
except ImportError:
    IMAGE_AVAILABLE = False
    print("⚠️  Görsel için: pip install Pillow")


# =============================================================================
# TEMEL YAPILAR
# =============================================================================

class AgentMode(Enum):
    """Agent modları"""
    RESEARCHER = "researcher"  # Araştırmacı
    CODER = "coder"            # Kod yazıcı
    DESIGNER = "designer"      # Tasarımcı
    MANAGER = "manager"        # Yönetici (ana agent)

@dataclass
class Task:
    """Görev yapısı"""
    id: str
    description: str
    agent_type: AgentMode
    status: str = "pending"  # pending, running, completed, failed
    result: Any = None
    created_at: datetime = field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None

@dataclass
class Memory:
    """Hafıza yapısı"""
    conversations: List[Dict] = field(default_factory=list)
    facts: Dict[str, str] = field(default_factory=dict)
    preferences: Dict[str, Any] = field(default_factory=dict)
    
    def add_conversation(self, role: str, content: str):
        self.conversations.append({
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat()
        })
        # Son 50 konuşmayı tut
        if len(self.conversations) > 50:
            self.conversations = self.conversations[-50:]
    
    def get_context(self, n: int = 5) -> str:
        """Son n konuşmayı getir"""
        recent = self.conversations[-n:]
        return "\n".join([f"{c['role']}: {c['content']}" for c in recent])


# =============================================================================
# WEB SCRAPER AGENT
# =============================================================================

class WebScraperAgent:
    """İnternette araştırma yapan agent"""
    
    def __init__(self):
        self.name = "WebScraper"
        self.session = requests.Session() if WEB_SCRAPING_AVAILABLE else None
        if self.session:
            self.session.headers.update({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })
    
    def search(self, query: str, max_results: int = 5) -> List[Dict]:
        """DuckDuckGo'da ara"""
        if not SEARCH_AVAILABLE:
            return [{"error": "Arama modülü yüklenmemiş"}]
        
        try:
            with DDGS() as ddgs:
                results = []
                for r in ddgs.text(query, max_results=max_results):
                    results.append({
                        "title": r.get("title", ""),
                        "url": r.get("href", ""),
                        "snippet": r.get("body", "")
                    })
                return results
        except Exception as e:
            return [{"error": f"Arama hatası: {str(e)}"}]
    
    def scrape_page(self, url: str) -> Dict:
        """Web sayfası içeriğini çek"""
        if not WEB_SCRAPING_AVAILABLE:
            return {"error": "Web scraping modülü yüklenmemiş"}
        
        try:
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Başlık
            title = soup.find('title')
            title_text = title.get_text(strip=True) if title else ""
            
            # Meta açıklama
            meta_desc = soup.find('meta', attrs={'name': 'description'})
            description = meta_desc.get('content', '') if meta_desc else ""
            
            # Tüm paragraflar
            paragraphs = soup.find_all('p')
            content = ' '.join([p.get_text(strip=True) for p in paragraphs[:10]])
            
            # Linkler
            links = [a.get('href') for a in soup.find_all('a', href=True)[:10]]
            
            return {
                "title": title_text,
                "description": description,
                "content": content[:2000],  # İlk 2000 karakter
                "links": links,
                "url": url
            }
        except Exception as e:
            return {"error": f"Sayfa çekme hatası: {str(e)}"}
    
    def research(self, topic: str) -> str:
        """Konu hakkında detaylı araştırma yap"""
        print(f"🔍 Araştırma başlatılıyor: {topic}")
        
        # 1. Ara
        search_results = self.search(topic, max_results=3)
        
        if not search_results or "error" in search_results[0]:
            return f"Araştırma yapılamadı: {search_results[0].get('error', 'Bilinmeyen hata')}"
        
        # 2. İlk 2 sonucu detaylı incele
        detailed_info = []
        for result in search_results[:2]:
            url = result.get("url", "")
            if url:
                page_data = self.scrape_page(url)
                if "error" not in page_data:
                    detailed_info.append(page_data)
        
        # 3. Özet oluştur
        summary = f"📊 '{topic}' Hakkında Araştırma Sonuçları:\n\n"
        
        for i, info in enumerate(detailed_info, 1):
            summary += f"{i}. {info.get('title', 'Başlık yok')}\n"
            summary += f"   URL: {info.get('url', '')}\n"
            summary += f"   İçerik: {info.get('content', '')[:500]}...\n\n"
        
        return summary


# =============================================================================
# CODE AGENT
# =============================================================================

class CodeAgent:
    """Kod yazan ve çalıştıran agent"""
    
    def __init__(self):
        self.name = "CodeAgent"
        self.supported_languages = ["python", "javascript", "html", "css", "bash"]
    
    def generate_code(self, description: str, language: str = "python") -> str:
        """Basit kod şablonları üret"""
        
        if language == "python":
            if "hesap" in description.lower() or "calculator" in description.lower():
                return '''def calculator():
    """Basit hesap makinesi"""
    print("Hesap Makinesi")
    print("1. Toplama")
    print("2. Çıkarma")
    print("3. Çarpma")
    print("4. Bölme")
    
    choice = input("Seçim (1-4): ")
    num1 = float(input("İlk sayı: "))
    num2 = float(input("İkinci sayı: "))
    
    if choice == '1':
        print(f"Sonuç: {num1 + num2}")
    elif choice == '2':
        print(f"Sonuç: {num1 - num2}")
    elif choice == '3':
        print(f"Sonuç: {num1 * num2}")
    elif choice == '4':
        print(f"Sonuç: {num1 / num2}")
    else:
        print("Geçersiz seçim")

if __name__ == "__main__":
    calculator()'''
            
            elif "web" in description.lower() or "site" in description.lower():
                return '''from http.server import HTTPServer, BaseHTTPRequestHandler

class SimpleHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/html; charset=utf-8')
        self.end_headers()
        
        html = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>Omega AI Tarafından Oluşturuldu</title>
            <style>
                body { font-family: Arial; text-align: center; padding: 50px; }
                h1 { color: #4CAF50; }
            </style>
        </head>
        <body>
            <h1>Merhaba Dünya!</h1>
            <p>Bu web sitesi Omega AI Agent tarafından otomatik oluşturuldu.</p>
        </body>
        </html>
        """
        self.wfile.write(html.encode('utf-8'))

if __name__ == "__main__":
    server = HTTPServer(('localhost', 8000), SimpleHandler)
    print("Server http://localhost:8000 adresinde çalışıyor...")
    server.serve_forever()'''
            
            else:
                return f'''# {description}
def main():
    """Ana fonksiyon"""
    print("Omega AI Agent tarafından oluşturuldu")
    print("Görev: {description}")
    
    # Kodunuzu buraya yazın
    pass

if __name__ == "__main__":
    main()'''
        
        elif language == "html":
            return f'''<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{description}</title>
    <style>
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }}
        .container {{
            background: rgba(255,255,255,0.1);
            padding: 30px;
            border-radius: 15px;
            backdrop-filter: blur(10px);
        }}
        h1 {{ text-align: center; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Omega AI Agent</h1>
        <p>{description}</p>
        <p>Bu sayfa otomatik olarak oluşturuldu.</p>
    </div>
</body>
</html>'''
        
        elif language == "javascript":
            return f'''// {description}
console.log("Omega AI Agent - JavaScript");

function init() {{
    console.log("Uygulama başlatıldı");
    // Kodunuzu buraya yazın
}}

document.addEventListener('DOMContentLoaded', init);'''
        
        return f"// {language} için kod şablonu"
    
    def execute_python(self, code: str) -> Dict:
        """Python kodunu güvenli şekilde çalıştır"""
        
        # Yasaklı kelimeler
        dangerous = ['import os', 'import sys', 'subprocess', 'eval(', 'exec(', '__import__']
        for d in dangerous:
            if d in code:
                return {
                    "success": False,
                    "output": "",
                    "error": f"Güvenlik: '{d}' kullanımına izin verilmez"
                }
        
        # Geçici dosya oluştur
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write(code)
            temp_file = f.name
        
        try:
            # 5 saniye timeout ile çalıştır
            result = subprocess.run(
                [sys.executable, temp_file],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            return {
                "success": result.returncode == 0,
                "output": result.stdout,
                "error": result.stderr
            }
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "output": "",
                "error": "Zaman aşımı (5 saniye)"
            }
        except Exception as e:
            return {
                "success": False,
                "output": "",
                "error": str(e)
            }
        finally:
            # Temizlik
            try:
                os.unlink(temp_file)
            except:
                pass
    
    def save_code(self, code: str, filename: str) -> str:
        """Kodu dosyaya kaydet"""
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(code)
            return f"✅ Kod kaydedildi: {filename}"
        except Exception as e:
            return f"❌ Kaydetme hatası: {str(e)}"


# =============================================================================
# IMAGE AGENT
# =============================================================================

class ImageAgent:
    """Görsel üreten agent"""
    
    def __init__(self):
        self.name = "ImageAgent"
        self.output_dir = "generated_images"
        os.makedirs(self.output_dir, exist_ok=True)
    
    def generate_simple_image(self, prompt: str, filename: Optional[str] = None) -> str:
        """Basit görsel oluştur (Pillow ile)"""
        
        if not IMAGE_AVAILABLE:
            return "❌ Pillow kütüphanesi yüklü değil: pip install Pillow"
        
        if filename is None:
            filename = f"image_{int(time.time())}.png"
        
        filepath = os.path.join(self.output_dir, filename)
        
        try:
            # 512x512 gradient görsel
            width, height = 512, 512
            image = Image.new('RGB', (width, height))
            draw = ImageDraw.Draw(image)
            
            # Renkli gradient arka plan
            for y in range(height):
                r = int(100 + (y / height) * 100)
                g = int(50 + (y / height) * 150)
                b = int(200 - (y / height) * 100)
                draw.line([(0, y), (width, y)], fill=(r, g, b))
            
            # Metin ekle
            text = prompt[:30]
            
            # Ortaya yerleştir
            text_x = width // 2 - 100
            text_y = height // 2 - 20
            
            # Metin arka planı
            draw.rectangle([text_x-10, text_y-10, text_x+300, text_y+40], 
                          fill=(0, 0, 0, 128))
            
            # Beyaz metin
            draw.text((text_x, text_y), text, fill=(255, 255, 255))
            
            # Alt bilgi
            draw.text((10, height-30), "Generated by Omega AI Agent", 
                     fill=(255, 255, 255))
            
            image.save(filepath)
            return f"✅ Görsel oluşturuldu: {filepath}"
            
        except Exception as e:
            return f"❌ Görsel oluşturma hatası: {str(e)}"
    
    def download_image(self, url: str, filename: Optional[str] = None) -> str:
        """İnternetten görsel indir"""
        
        if filename is None:
            filename = f"downloaded_{int(time.time())}.jpg"
        
        filepath = os.path.join(self.output_dir, filename)
        
        try:
            urllib.request.urlretrieve(url, filepath)
            return f"✅ Görsel indirildi: {filepath}"
        except Exception as e:
            return f"❌ İndirme hatası: {str(e)}"


# =============================================================================
# MANAGER AGENT (ANA AGENT)
# =============================================================================

class OmegaManager:
    """Ana yönetici agent - diğer agent'ları yönetir"""
    
    def __init__(self):
        self.name = "OmegaManager"
        self.memory = Memory()
        
        # Alt agent'ları oluştur
        self.web_agent = WebScraperAgent()
        self.code_agent = CodeAgent()
        self.image_agent = ImageAgent()
        
        # Görev kuyruğu
        self.tasks: List[Task] = []
        self.task_counter = 0
        
        print("🚀 Omega AI Agent başlatıldı!")
        print("=" * 50)
    
    def create_task(self, description: str, agent_type: AgentMode) -> Task:
        """Yeni görev oluştur"""
        self.task_counter += 1
        task = Task(
            id=f"task_{self.task_counter}",
            description=description,
            agent_type=agent_type
        )
        self.tasks.append(task)
        return task
    
    def process_request(self, user_input: str) -> str:
        """Kullanıcı isteğini işle"""
        
        # Hafızaya kaydet
        self.memory.add_conversation("user", user_input)
        
        # İstek tipini belirle
        input_lower = user_input.lower()
        
        # Çoklu agent gerektiren görevler
        if any(word in input_lower for word in ["web sitesi", "website", "proje", "uygulama"]):
            return self._multi_agent_web_project(user_input)
        
        # Tekli görevler
        elif any(word in input_lower for word in ["ara", "araştır", "bul", "nedir", "nasıl"]):
            return self._handle_research(user_input)
        
        elif any(word in input_lower for word in ["kod", "python", "yaz", "function", "class"]):
            return self._handle_code(user_input)
        
        elif any(word in input_lower for word in ["resim", "görsel", "image", "çiz", "foto"]):
            return self._handle_image(user_input)
        
        else:
            # Genel sohbet
            return self._handle_chat(user_input)
    
    def _handle_research(self, query: str) -> str:
        """Araştırma görevini işle"""
        print(f"\n📋 [RESEARCHER] Görev başlatıldı")
        
        # Konuyu çıkar
        topic = query.replace("ara", "").replace("araştır", "").replace("bul", "").strip()
        if not topic:
            topic = query
        
        result = self.web_agent.research(topic)
        
        self.memory.add_conversation("assistant", result)
        return result
    
    def _handle_code(self, request: str) -> str:
        """Kod görevini işle"""
        print(f"\n📋 [CODER] Görev başlatıldı")
        
        # Dil belirle
        language = "python"
        if "javascript" in request.lower() or "js" in request.lower():
            language = "javascript"
        elif "html" in request.lower():
            language = "html"
        
        # Kod üret
        code = self.code_agent.generate_code(request, language)
        
        # Dosyaya kaydet
        ext = {"python": "py", "javascript": "js", "html": "html", "css": "css"}
        filename = f"generated_code.{ext.get(language, 'txt')}"
        save_result = self.code_agent.save_code(code, filename)
        
        result = f"✅ Kod oluşturuldu ({language}):\n\n```{language}\n{code}\n```\n\n{save_result}"
        
        # Python ise çalıştırma seçeneği sun
        if language == "python":
            result += "\n\n💡 Çalıştırmak için: 'çalıştır' yazın"
        
        self.memory.add_conversation("assistant", result)
        return result
    
    def _handle_image(self, request: str) -> str:
        """Görsel görevini işle"""
        print(f"\n📋 [DESIGNER] Görev başlatıldı")
        
        # Prompt çıkar
        prompt = request.replace("resim", "").replace("görsel", "").replace("çiz", "").strip()
        if not prompt:
            prompt = "Omega AI Generated Image"
        
        result = self.image_agent.generate_simple_image(prompt)
        
        self.memory.add_conversation("assistant", result)
        return result
    
    def _handle_chat(self, message: str) -> str:
        """Genel sohbet"""
        responses = [
            f"Anladım: '{message}'. Size nasıl yardımcı olabilirim?",
            "Merhaba! Web araştırması, kod yazma veya görsel oluşturma yapabilirim.",
            "Komutlar: 'ara [konu]', 'kod yaz [açıklama]', 'resim [açıklama]'"
        ]
        
        # Basit yanıt seçimi
        if "merhaba" in message.lower():
            response = responses[1]
        elif "yardım" in message.lower() or "help" in message.lower():
            response = responses[2]
        else:
            response = responses[0]
        
        self.memory.add_conversation("assistant", response)
        return response
    
    def _multi_agent_web_project(self, request: str) -> str:
        """Multi-agent web projesi"""
        print(f"\n🤖 [MANAGER] Multi-Agent modu aktif!")
        print("Agent'lar kendini bölüyor...\n")
        
        results = []
        
        # 1. Araştırmacı - Web tasarım trendlerini araştır
        print("📊 [RESEARCHER] Web tasarım trendleri araştırılıyor...")
        research = self.web_agent.search("modern web design trends 2024", max_results=2)
        results.append("🔍 Araştırma tamamlandı")
        
        # 2. Tasarımcı - HTML/CSS oluştur
        print("🎨 [DESIGNER] HTML/CSS oluşturuluyor...")
        html_code = self.code_agent.generate_code("Modern web sitesi ana sayfa", "html")
        css_code = """/* Modern Styles */
body { margin: 0; font-family: Arial; }
.container { max-width: 1200px; margin: 0 auto; padding: 20px; }"""
        
        # Dosyalara kaydet
        self.code_agent.save_code(html_code, "index.html")
        self.code_agent.save_code(css_code, "style.css")
        results.append("🎨 Tasarım tamamlandı (index.html, style.css)")
        
        # 3. Kodcu - Backend Python kodu
        print("💻 [CODER] Backend kodu yazılıyor...")
        backend_code = self.code_agent.generate_code("Web sunucusu backend", "python")
        self.code_agent.save_code(backend_code, "server.py")
        results.append("💻 Backend tamamlandı (server.py)")
        
        # 4. Görselci - Placeholder görsel
        print("🖼️  [DESIGNER] Placeholder görsel oluşturuluyor...")
        img_result = self.image_agent.generate_simple_image("Website Hero Image", "hero.png")
        results.append(f"🖼️  Görsel tamamlandı")
        
        # Sonuç
        final_result = """
🎉 PROJE TAMAMLANDI! 

Omega AI Agent kendini 4 parçaya böldü ve her biri farklı görev yaptı:

""" + "\n".join(results) + """

📁 Oluşturulan dosyalar:
- index.html (Ana sayfa)
- style.css (Stil dosyası)
- server.py (Python backend)
- generated_images/hero.png (Görsel)

🚀 Başlatmak için:
python server.py
"""
        
        return final_result
    
    def execute_saved_code(self) -> str:
        """Kaydedilmiş Python kodunu çalıştır"""
        try:
            with open("generated_code.py", "r") as f:
                code = f.read()
            
            result = self.code_agent.execute_python(code)
            
            if result["success"]:
                return f"✅ Çalıştırma başarılı:\n{result['output']}"
            else:
                return f"❌ Hata:\n{result['error']}"
        except FileNotFoundError:
            return "❌ generated_code.py bulunamadı. Önce kod yazdırın."
    
    def show_status(self) -> str:
        """Agent durumunu göster"""
        status = f"""
🤖 OMEGA AI AGENT DURUMU
{'=' * 40}

📊 Agent'lar:
  - WebScraper: {'✅ Aktif' if WEB_SCRAPING_AVAILABLE else '❌ Devre dışı'}
  - CodeAgent: ✅ Aktif
  - ImageAgent: {'✅ Aktif' if IMAGE_AVAILABLE else '❌ Devre dışı'}
  - Search: {'✅ Aktif' if SEARCH_AVAILABLE else '❌ Devre dışı'}

💾 Hafıza:
  - Konuşma sayısı: {len(self.memory.conversations)}
  - Görev sayısı: {len(self.tasks)}

📝 Son konuşmalar:
{self.memory.get_context(3)}

💡 Komutlar:
  - ara [konu] → İnternette araştırma yap
  - kod yaz [açıklama] → Kod üret
  - resim [açıklama] → Görsel oluştur
  - web sitesi yap → Multi-agent proje
  - çalıştır → Son kodu çalıştır
  - durum → Bu ekranı göster
  - çık → Programı kapat
"""
        return status


# =============================================================================
# ANA PROGRAM
# =============================================================================

def main():
    """Ana program döngüsü"""
    
    # Agent'ı başlat
    omega = OmegaManager()
    
    # Başlangıç mesajı
    print(omega.show_status())
    
    print("\n" + "=" * 50)
    print("OMEGA AI AGENT - HAZIR")
    print("=" * 50)
    print("Komut yazın (yardım için 'durum' yazın)\n")
    
    # Ana döngü
    while True:
        try:
            user_input = input("\n👤 Sen: ").strip()
            
            if not user_input:
                continue
            
            if user_input.lower() in ["çık", "exit", "quit", "q"]:
                print("\n👋 Görüşmek üzere!")
                break
            
            elif user_input.lower() in ["durum", "status", "help", "yardım"]:
                print(omega.show_status())
            
            elif user_input.lower() == "çalıştır":
                print("\n🤖 Omega:")
                print(omega.execute_saved_code())
            
            else:
                print("\n🤖 Omega düşünüyor...")
                response = omega.process_request(user_input)
                print(f"\n🤖 Omega:\n{response}")
        
        except KeyboardInterrupt:
            print("\n\n👋 Görüşmek üzere!")
            break
        except Exception as e:
            print(f"\n❌ Hata: {str(e)}")


if __name__ == "__main__":
    main()
