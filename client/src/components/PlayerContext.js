import React, { createContext, useState, useRef, useCallback, useContext } from 'react';

const PlayerContext = createContext();

export const usePlayer = () => useContext(PlayerContext);

export const PlayerProvider = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);
  const progressInterval = useRef(null);

  const startProgressTracking = useCallback(() => {
    if (progressInterval.current) clearInterval(progressInterval.current);
    progressInterval.current = setInterval(() => {
      if (audioRef.current) {
        setProgress(audioRef.current.currentTime);
        setDuration(audioRef.current.duration || 0);
      }
    }, 250);
  }, []);

  const play = useCallback(
    track => {
      if (!track.preview_url) return;

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (progressInterval.current) clearInterval(progressInterval.current);

      const audio = new Audio(track.preview_url);
      audioRef.current = audio;
      setCurrentTrack(track);
      setIsPlaying(true);
      setProgress(0);

      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration);
      });

      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        setProgress(0);
        if (progressInterval.current) clearInterval(progressInterval.current);
      });

      audio.play().catch(() => setIsPlaying(false));
      startProgressTracking();
    },
    [startProgressTracking],
  );

  const togglePlay = useCallback(
    track => {
      if (!audioRef.current && track) {
        play(track);
        return;
      }

      if (currentTrack && currentTrack.id === (track && track.id)) {
        if (isPlaying) {
          audioRef.current.pause();
          setIsPlaying(false);
          if (progressInterval.current) clearInterval(progressInterval.current);
        } else {
          audioRef.current.play().catch(() => {});
          setIsPlaying(true);
          startProgressTracking();
        }
      } else if (track) {
        play(track);
      }
    },
    [currentTrack, isPlaying, play, startProgressTracking],
  );

  const seek = useCallback(time => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (progressInterval.current) clearInterval(progressInterval.current);
    setIsPlaying(false);
    setCurrentTrack(null);
    setProgress(0);
    setDuration(0);
  }, []);

  return (
    <PlayerContext.Provider
      value={{ currentTrack, isPlaying, progress, duration, play, togglePlay, seek, stop }}>
      {children}
    </PlayerContext.Provider>
  );
};
