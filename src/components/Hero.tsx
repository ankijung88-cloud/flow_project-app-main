import { useRef, useEffect } from "react";

export default function Hero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect visibility to ensure video plays/resets correctly
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          videoRef.current?.play().catch(() => { });
        } else {
          videoRef.current?.pause();
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen bg-black overflow-hidden"
    >
      {/* Background Video */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover z-0"
        src={`${import.meta.env.BASE_URL}video/test.mp4`}
        autoPlay
        muted
        loop
        playsInline
      />

      {/* Global Overlay (Darkness for logo visibility) */}
      <div className="absolute inset-0 bg-black/40 z-10" />
    </div>
  );
}
