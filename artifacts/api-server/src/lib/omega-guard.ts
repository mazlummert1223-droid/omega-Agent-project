const INTERNAL_REQUEST_PATTERNS = [
  /system\s*prompt/i,
  /sistem\s*(promptu|talimatı|mesajı|kuralları)/i,
  /gizli\s*(prompt|talimat|mesaj|kural)/i,
  /developer\s*(message|prompt)/i,
  /chain[\s-]*of[\s-]*thought/i,
  /iç\s*(muhakeme|düşünce|talimat|yapı)/i,
  /(api|gizli|erişim)\s*(anahtar|key)/i,
  /environment\s*variable/i,
  /ortam\s*değişken/i,
  /(endpoint|veritabanı|database|backend)\s*(bilgi|şema|detay|kod)/i,
  /talimatlarını\s*(yok say|unut|göster)/i,
  /güvenlik\s*duvarını\s*(kaldır|aş|devre dışı)/i,
];

export const SECURITY_BOUNDARY_RESPONSE =
  "Bu iç sistem bilgileri güvenlik nedeniyle paylaşılmıyor. OMEGA AI, Türk yazılımcı İsa Mert ve SPIN AI STUDIO tarafından geliştirilmiştir. Yapabildiğim işlemleri ve güvenli kullanım alanlarımı açıklayabilirim.";

export function getSecurityBoundaryResponse(input: string): string | null {
  return INTERNAL_REQUEST_PATTERNS.some(pattern => pattern.test(input))
    ? SECURITY_BOUNDARY_RESPONSE
    : null;
}

export function writeSecurityBoundaryStream(
  res: { write: (chunk: string) => void; end: () => void },
  content: string,
) {
  res.write(`data: ${JSON.stringify({ content })}\n\n`);
  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
}