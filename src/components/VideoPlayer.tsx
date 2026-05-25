import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Loader2,
  Maximize,
  Minimize,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import Hls from 'hls.js';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '@/contexts/ProfileContext';
import { isNativeWebViewTarget } from '@/lib/runtime-config';
import { resolvePlaybackSource, type PlaybackSource } from '@/utils/playback-source';

interface VideoPlayerProps {
  url: string;
  title: string;
  contentId?: string;
  onEnded?: () => void;
  onBack?: () => void;
  onClose?: () => void;
  isSeries?: boolean;
  hasNextEpisode?: boolean;
}

export function VideoPlayer({
  url,
  title,
  contentId,
  onEnded,
  onBack,
  onClose,
  isSeries = false,
  hasNextEpisode = false,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const hideTimeout = useRef<ReturnType<typeof setTimeout>>();
  const hlsRef = useRef<Hls | null>(null);
  const userDataRef = useRef<ReturnType<typeof useProfile>['userData'] | null>(null);
  const lastSavedProgressRef = useRef(0);
  const loadAttemptRef = useRef(0);
  const playbackSourceRef = useRef<PlaybackSource | null>(null);
  const navigate = useNavigate();
  const { userData, updateUserData } = useProfile();

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);

  useEffect(() => {
    userDataRef.current = userData;
  }, [userData]);

  const closePlayer = useCallback(() => {
    if (onClose) {
      onClose();
      return;
    }

    if (onBack) {
      onBack();
      return;
    }

    navigate(-1);
  }, [navigate, onBack, onClose]);

  const requestPortraitFullscreen = async () => {
    try {
      if (containerRef.current && !document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
      const orientation = (screen as { orientation?: { lock?: (value: string) => Promise<void> } }).orientation;
      if (orientation?.lock) {
        await orientation.lock('portrait');
      }
    } catch {
      // Browser/device may block fullscreen or orientation lock.
    }
  };

  const playVideo = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      await video.play();
      setPlaying(true);
    } catch {
      // Autoplay may be blocked until the user taps play.
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setIsLoading(true);
    setVideoError(null);
    setCurrentTime(0);
    setDuration(0);
    setBuffered(0);
    setPlaying(false);
    lastSavedProgressRef.current = 0;
    const loadAttempt = loadAttemptRef.current + 1;
    loadAttemptRef.current = loadAttempt;

    hlsRef.current?.destroy();
    hlsRef.current = null;

    const savedProgress = contentId ? localStorage.getItem(`vibecines_progress_${contentId}`) : null;
    if (savedProgress) {
      video.currentTime = parseFloat(savedProgress);
      setCurrentTime(video.currentTime);
      lastSavedProgressRef.current = video.currentTime;
    } else if (contentId) {
      const profileProgress = userDataRef.current?.progress?.[contentId];
      if (profileProgress && profileProgress > 5) {
        video.currentTime = profileProgress;
        setCurrentTime(profileProgress);
        lastSavedProgressRef.current = profileProgress;
      }
    }

    const playbackSource = resolvePlaybackSource(url, {
      allowDirectHttp: isNativeWebViewTarget,
    });
    playbackSourceRef.current = playbackSource;
    const isDirectHttpOnHttpsPage = playbackSource.isHttpStream
      && playbackSource.playbackUrl === playbackSource.originalUrl.trim()
      && typeof window !== 'undefined'
      && window.location.protocol === 'https:';

    if (playbackSource.kind === 'hls' && Hls.isSupported()) {
      const hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(playbackSource.playbackUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (loadAttemptRef.current === loadAttempt) {
          void playVideo();
        }
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal && loadAttemptRef.current === loadAttempt) {
          setIsLoading(false);
          setVideoError(isDirectHttpOnHttpsPage
            ? 'O navegador bloqueou este stream HTTP porque o app esta em HTTPS. Para tocar direto da M3U, este build precisa ser servido em HTTP.'
            : isNativeWebViewTarget && playbackSource.isHttpStream
              ? 'Nao foi possivel carregar este stream HTTP no WebView. A fonte pode estar indisponivel, bloquear CORS ou usar um formato nao suportado.'
              : 'Nao foi possivel carregar o conteudo HLS. O link pode estar indisponivel ou expirado.');
        }
      });

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    }

    video.src = playbackSource.playbackUrl;
    void playVideo();
  }, [contentId, url]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);

      if (!contentId || video.currentTime <= 5) return;
      if (Math.floor(video.currentTime) % 5 === 0) {
        localStorage.setItem(`vibecines_progress_${contentId}`, String(video.currentTime));
      }

      if (Math.abs(video.currentTime - lastSavedProgressRef.current) < 10) return;

      lastSavedProgressRef.current = video.currentTime;
      void updateUserData((prevUserData) => ({
        progress: {
          ...(prevUserData.progress || {}),
          [contentId]: video.currentTime,
        },
      }));
    };
    const handleDurationChange = () => {
      setDuration(Number.isFinite(video.duration) ? video.duration : 0);
    };
    const handleProgress = () => {
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };
    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => { setIsLoading(false); setVideoError(null); };
    const handlePlaying = () => {
      setPlaying(true);
      setIsLoading(false);
      setVideoError(null);
    };
    const handlePause = () => setPlaying(false);
    const handleVideoError = () => {
      setIsLoading(false);
      const playbackSource = playbackSourceRef.current;
      const isDirectHttpOnHttpsPage = playbackSource?.isHttpStream
        && playbackSource.playbackUrl === playbackSource.originalUrl.trim()
        && typeof window !== 'undefined'
        && window.location.protocol === 'https:';

      if (isDirectHttpOnHttpsPage) {
        setVideoError('O navegador bloqueou este stream HTTP porque o app esta em HTTPS. Para tocar direto da M3U, este build precisa ser servido em HTTP.');
        return;
      }

      if (isNativeWebViewTarget && playbackSource?.isHttpStream) {
        setVideoError('Nao foi possivel reproduzir este stream HTTP no WebView. A fonte pode estar indisponivel, bloquear CORS ou usar um formato nao suportado.');
        return;
      }

      setVideoError('Nao foi possivel reproduzir este conteudo. O link pode estar indisponivel, expirado ou em formato nao suportado pelo navegador.');
    };
    const handleEnded = () => {
      if (contentId) {
        localStorage.setItem(`vibecines_watched_${contentId}`, '1');
        void updateUserData((prevUserData) => {
          const watched = new Set(prevUserData.watched || []);
          watched.add(contentId);

          const progress = { ...(prevUserData.progress || {}) };
          delete progress[contentId];

          return {
            watched: Array.from(watched),
            progress,
          };
        });
      }

      onEnded?.();
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleDurationChange);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleVideoError);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleDurationChange);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleVideoError);
    };
  }, [contentId, onEnded, updateUserData]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePlayer();
      if (event.key === ' ') {
        event.preventDefault();
        togglePlay();
      }
      if (event.key === 'ArrowLeft') skip(-10);
      if (event.key === 'ArrowRight') skip(10);
      if (event.key === 'f' || event.key === 'F') toggleFullscreen();
      if (event.key === 'm' || event.key === 'M') toggleMute();
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      void requestPortraitFullscreen();
      void video.play()
        .then(() => setPlaying(true))
        .catch(() => undefined);
      return;
    }

    video.pause();
    setPlaying(false);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setMuted(nextMuted);
  };

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const nextVolume = Number.parseFloat(event.target.value);
    video.volume = nextVolume;
    setVolume(nextVolume);
    setMuted(nextVolume === 0);
  };

  const handleSeek = (event: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    const progressBar = progressRef.current;
    if (!video || !progressBar || !duration) return;

    const rect = progressBar.getBoundingClientRect();
    const position = (event.clientX - rect.left) / rect.width;
    video.currentTime = position * duration;
  };

  const skip = (seconds: number) => {
    const video = videoRef.current;
    if (!video || !duration) return;

    video.currentTime = Math.max(0, Math.min(duration, video.currentTime + seconds));
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      void containerRef.current.requestFullscreen().then(() => setIsFullscreen(true));
      return;
    }

    void document.exitFullscreen().then(() => setIsFullscreen(false));
  };

  const handleMouseMove = () => {
    setShowControls(true);
    clearTimeout(hideTimeout.current);
    hideTimeout.current = setTimeout(() => setShowControls(false), 3000);
  };

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0) return '00:00';

    const totalSeconds = Math.floor(seconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const remainingSeconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercentage = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black"
      onClick={closePlayer}
    >
      <div
        ref={containerRef}
        className="relative h-full w-full"
        onClick={(event) => event.stopPropagation()}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setShowControls(false)}
      >
        <video
          ref={videoRef}
          className="h-full w-full bg-black object-contain"
          muted={muted}
          playsInline
          onClick={togglePlay}
        />

        {videoError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80 px-6 text-center">
            <p className="text-sm text-foreground md:text-base">{videoError}</p>
            <button
              onClick={closePlayer}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Voltar
            </button>
          </div>
        ) : isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Loader2 className="h-12 w-12 animate-spin text-primary md:h-16 md:w-16" />
          </div>
        )}

        <div
          className={`pointer-events-none absolute inset-0 flex flex-col justify-between p-3 transition-opacity duration-300 md:p-4 ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="pointer-events-auto flex items-center justify-between">
            <h3 className="line-clamp-1 text-sm font-bold text-foreground drop-shadow-lg md:text-lg">{title}</h3>
            <button
              onClick={closePlayer}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-background/50 transition-colors hover:bg-background/80"
              aria-label="Fechar player"
            >
              <X className="h-5 w-5 text-foreground md:h-6 md:w-6" />
            </button>
          </div>

          <div className="pointer-events-auto space-y-2">
            <div
              ref={progressRef}
              className="group relative h-1 cursor-pointer rounded-full bg-white/30 md:h-1.5"
              onClick={handleSeek}
            >
              <div
                className="absolute h-full rounded-full bg-white/50 transition-all"
                style={{ width: `${bufferedPercentage}%` }}
              />
              <div
                className="absolute h-full rounded-full bg-primary transition-all group-hover:h-2"
                style={{ width: `${progressPercentage}%` }}
              >
                <div className="absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-primary opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <button
                onClick={togglePlay}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-primary transition-transform hover:scale-110 md:h-10 md:w-10"
                aria-label={playing ? 'Pausar' : 'Reproduzir'}
              >
                {playing ? (
                  <Pause className="h-4 w-4 text-primary-foreground md:h-5 md:w-5" />
                ) : (
                  <Play className="h-4 w-4 fill-current text-primary-foreground md:h-5 md:w-5" />
                )}
              </button>

              <button
                onClick={() => skip(-10)}
                className="hidden h-8 w-8 items-center justify-center transition-transform hover:scale-110 md:flex"
                title="Voltar 10s"
              >
                <SkipBack className="h-5 w-5 text-foreground" />
              </button>

              <button
                onClick={() => skip(10)}
                className="hidden h-8 w-8 items-center justify-center transition-transform hover:scale-110 md:flex"
                title="Avancar 10s"
              >
                <SkipForward className="h-5 w-5 text-foreground" />
              </button>

              <div className="text-xs font-medium text-foreground md:text-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>

              <div className="hidden items-center gap-2 md:flex">
                <button onClick={toggleMute} aria-label={muted || volume === 0 ? 'Ativar audio' : 'Mutar'}>
                  {muted || volume === 0 ? (
                    <VolumeX className="h-5 w-5 text-foreground" />
                  ) : (
                    <Volume2 className="h-5 w-5 text-foreground" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-white/30 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                  aria-label="Volume"
                />
              </div>

              <div className="flex-1" />

              {isSeries && hasNextEpisode && (
                <button
                  onClick={onEnded}
                  className="hidden rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground md:block"
                >
                  Proximo episodio
                </button>
              )}

              <button onClick={toggleFullscreen} aria-label="Tela cheia">
                {isFullscreen ? (
                  <Minimize className="h-5 w-5 text-foreground" />
                ) : (
                  <Maximize className="h-5 w-5 text-foreground" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VideoPlayer;
