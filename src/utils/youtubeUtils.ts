export function extractYouTubeVideoId(url: string): string | null {
  if (!url) {
    console.warn('⚠️ extractYouTubeVideoId: Empty URL provided');
    return null;
  }

  console.log('🔍 Extracting YouTube ID from:', url);

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?/#]+)/,
    /youtube\.com\/shorts\/([^&\s?/#]+)/,
    /youtube\.com\/v\/([^&\s?/#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      console.log('✅ Extracted ID via pattern:', match[1]);
      return match[1];
    }
  }

  // Check if it's already a video ID (11 characters)
  const trimmedUrl = url.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmedUrl)) {
    console.log('✅ Input is already a video ID:', trimmedUrl);
    return trimmedUrl;
  }

  console.error('❌ Failed to extract video ID from:', url);
  return null;
}

export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}

export function getYouTubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

export function isValidYouTubeUrl(url: string): boolean {
  return extractYouTubeVideoId(url) !== null;
}
