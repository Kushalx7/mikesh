import { useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import data from './config/experience.json';

type StoryItem = typeof data.story[number];
type GalleryItem = typeof data.gallery[number];
type DreamItem = typeof data.futureDreams[number];
type MemoryStar = typeof data.memoryStars[number];

const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

function formatCountdown(diff: number) {
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds };
}

function layoutHeartStars(n: number) {
  const points = [] as { x: number; y: number }[];
  for (let i = 0; i < n; i += 1) {
    const t = (i / n) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    points.push({ x, y });
  }
  return points;
}

function App() {
  const [isReady, setIsReady] = useState(false);
  const [isOpened, setIsOpened] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [typedLetter, setTypedLetter] = useState('');
  const [revealedReasons, setRevealedReasons] = useState<string[]>([]);
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryItem | null>(null);
  const [memoryPopup, setMemoryPopup] = useState<MemoryStar | null>(null);
  const [finaleVisible, setFinaleVisible] = useState(false);
  const [finalMessageVisible, setFinalMessageVisible] = useState(false);
  const [finalPageVisible, setFinalPageVisible] = useState(false);
  const [dreamFlips, setDreamFlips] = useState<Record<number, boolean>>({});
  const [progressValue, setProgressValue] = useState(0);
  const [heartProgress, setHeartProgress] = useState(0);
  const starCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const finaleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const finaleSectionRef = useRef<HTMLElement | null>(null);
  const letterRef = useRef<HTMLDivElement | null>(null);
  const animationFrame = useRef<number | null>(null);

  const metDate = useMemo(() => new Date(data.metSince), []);
  const starPoints = useMemo(() => layoutHeartStars(data.memoryStars.length), []);
  const getMemoryGalleryPhoto = (star: MemoryStar) => (star.photoIndex !== undefined ? data.gallery[star.photoIndex] : null);

  useEffect(() => {
    const update = () => {
      const diff = Math.max(0, Date.now() - metDate.getTime());
      setCountdown(formatCountdown(diff));
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [metDate]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const glow = document.querySelector('.cursor-glow') as HTMLDivElement | null;
    const dot = document.querySelector('.cursor-dot') as HTMLDivElement | null;
    const move = (event: PointerEvent) => {
      if (!glow || !dot) return;
      glow.style.left = `${event.clientX}px`;
      glow.style.top = `${event.clientY}px`;
      dot.style.left = `${event.clientX}px`;
      dot.style.top = `${event.clientY}px`;
    };
    if (!('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
      window.addEventListener('pointermove', move);
    }
    return () => window.removeEventListener('pointermove', move);
  }, []);

  useEffect(() => {
    const container = letterRef.current;
    if (!container || typedLetter) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !typedLetter) {
        let i = 0;
        const text = data.loveLetter;
        const interval = window.setInterval(() => {
          i += 1;
          setTypedLetter(text.slice(0, i));
          if (i >= text.length) window.clearInterval(interval);
        }, 20);
        observer.disconnect();
      }
    }, { threshold: 0.4 });
    observer.observe(container);
    return () => observer.disconnect();
  }, [typedLetter]);

  useEffect(() => {
    const handleResize = () => drawStars();
    window.addEventListener('resize', handleResize);
    drawStars();
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrame.current) window.cancelAnimationFrame(animationFrame.current);
    };
  }, [starPoints]);

  useEffect(() => {
    if (!finaleVisible) return;
    drawFinaleHeart(1);
  }, [finaleVisible]);

  const drawStars = () => {
    const canvas = starCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.clearRect(0, 0, rect.width, rect.height);
    const cx = rect.width / 2;
    const cy = rect.height / 2 + rect.height * 0.05;
    const scale = Math.min(rect.width, rect.height) / 42;
    ctx.strokeStyle = 'rgba(181,146,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    starPoints.forEach((point, index) => {
      const x = cx + point.x * scale;
      const y = cy + point.y * scale;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();
    starPoints.forEach((point, index) => {
      const x = cx + point.x * scale;
      const y = cy + point.y * scale;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, 16);
      gradient.addColorStop(0, index % 2 === 0 ? 'rgba(255,111,160,0.95)' : 'rgba(243,199,119,0.95)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      (starPoints[index] as any)._x = x;
      (starPoints[index] as any)._y = y;
    });
  };

  const drawFinaleHeart = (progress: number) => {
    const canvas = finaleCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.clearRect(0, 0, rect.width, rect.height);
    const points = layoutHeartStars(120);
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const scale = Math.min(rect.width, rect.height) / 42;
    const count = Math.floor(points.length * progress);
    for (let i = 0; i < count; i += 1) {
      const p = points[i];
      const x = cx + p.x * scale;
      const y = cy + p.y * scale;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(255,111,160,0.95)' : i % 3 === 1 ? 'rgba(243,199,119,0.95)' : 'rgba(181,146,255,0.95)';
      ctx.beginPath();
      ctx.arc(x, y, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const startExperience = () => {
    setIsOpened(true);
    window.setTimeout(() => {
      triggerConfetti(130);
      setIsReady(true);
    }, 1500);
  };

  const triggerConfetti = (count = 120) => {
    confetti({ particleCount: count, spread: 110, origin: { y: 0.7 }, colors: ['#ff6fa0', '#f3c777', '#b592ff', '#fbf3ea'] });
  };

  const handleStarClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = starCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const closest = starPoints.reduce(
      (best, point, index) => {
        const dx = (point as any)._x - x;
        const dy = (point as any)._y - y;
        const distance = Math.hypot(dx, dy);
        if (distance < best.distance) return { distance, index };
        return best;
      },
      { distance: Infinity, index: 0 }
    );
    if (closest.distance < 40) {
      setMemoryPopup(data.memoryStars[closest.index]);
    }
  };

  const handleFinale = () => {
    triggerConfetti(220);
    setFinalMessageVisible(true);
    setFinaleVisible(true);
    setFinalPageVisible(true);
  };

  const toggleReason = (reason: string) => {
    setRevealedReasons((current) => (current.includes(reason) ? current : [...current, reason]));
    triggerConfetti(18);
  };

  const toggleBucket = (item: string) => {
    setCheckedItems((current) =>
      current.includes(item) ? current.filter((value) => value !== item) : [...current, item]
    );
    if (!checkedItems.includes(item)) triggerConfetti(28);
  };

  const toggleDreamFlip = (index: number) => {
    setDreamFlips((current) => ({ ...current, [index]: !current[index] }));
  };

  const openPhoto = (item: GalleryItem) => setSelectedPhoto(item);
  const closePhoto = () => setSelectedPhoto(null);

  const progress = useMemo(() => (progressValue / 100) * 1, [progressValue]);

  useEffect(() => {
    const loader = window.setInterval(() => {
      setProgressValue((value) => {
        const next = value + Math.random() * 12;
        if (next >= 100) {
          window.clearInterval(loader);
          return 100;
        }
        return next;
      });
    }, 200);
    return () => window.clearInterval(loader);
  }, []);

  return (
    <div className="page-shell">
      <div className="floating-background"></div>
      <div className="cursor-glow" />
      <div className="cursor-dot" />
      <button className="control-button theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      <div className={`overlay ${isOpened ? 'opening' : ''}`}>
        <div className="opening-card">
          <div className="hero-symbol">❤</div>
          <p className="opening-eyebrow">a surprise, just for you</p>
          <p className="opening-line">Someone has a surprise waiting for you ❤️</p>
          <div className="loading-track">
            <div className="loading-fill" style={{ width: `${progressValue}%` }} />
          </div>
          <button className="open-button" onClick={startExperience} disabled={progressValue < 100}>
            Open My Heart
          </button>
          <p className="hint-text">{progressValue < 100 ? 'Gathering our story…' : 'Tap to enter your love story'}</p>
        </div>
      </div>

      <main className={`site-shell ${isReady ? 'ready' : ''}`}>
        <section className="hero-section">
          <div className="hero-copy">
            <span className="eyebrow-caption">for {data.herName}</span>
            <h1>{data.heroTitle}</h1>
            <p className="hero-subtitle">{data.heroTagline}</p>
          </div>
          <div className="countdown-grid">
            <div className="count-cell"><span>{countdown.days}</span><small>Days</small></div>
            <div className="count-cell"><span>{String(countdown.hours).padStart(2, '0')}</span><small>Hours</small></div>
            <div className="count-cell"><span>{String(countdown.minutes).padStart(2, '0')}</span><small>Minutes</small></div>
            <div className="count-cell"><span>{String(countdown.seconds).padStart(2, '0')}</span><small>Seconds</small></div>
          </div>
          <p className="section-cta">since the day we met ↓</p>
        </section>

        <section className="section-card story-section">
          <div className="section-header"><span className="eyebrow-caption">our story</span><h2>Every Chapter With You</h2></div>
          <div className="timeline-list">
            {data.story.map((item, index) => (
              <article className="timeline-card" key={index}>
                <div className="timeline-badge">{item.emoji}</div>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section-card gallery-section">
          <div className="section-header"><span className="eyebrow-caption">memory gallery</span><h2>Moments We Kept</h2></div>
          <div className="gallery-grid">
            {data.gallery.map((item, index) => (
              <button className="gallery-item" key={index} onClick={() => openPhoto(item)}>
                <img src={`/photos/${item.src}`} alt={item.alt} loading="lazy" />
                <div className="gallery-caption">{item.cap}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="section-card letter-section">
          <div className="section-header"><span className="eyebrow-caption">a letter</span><h2>For Your Eyes Only</h2></div>
          <div className="letter-card" ref={letterRef}>
            <div className="letter-copy">{typedLetter || <span className="letter-placeholder">The words appear as you scroll…</span>}</div>
          </div>
        </section>

        <section className="section-card reasons-section">
          <div className="section-header"><span className="eyebrow-caption">reasons</span><h2>Why I Love You</h2></div>
          <div className="reasons-grid">
            {data.reasons.map((reason, index) => (
              <button
                className={`reason-card ${revealedReasons.includes(reason) ? 'flipped' : ''}`}
                key={index}
                onClick={() => toggleReason(reason)}
              >
                <div className="reason-inner">
                  <div className="reason-front">❤</div>
                  <div className="reason-back">{reason}</div>
                </div>
              </button>
            ))}
          </div>
          <p className="small-note">{revealedReasons.length} / {data.reasons.length} revealed — tap every card</p>
        </section>

        <section className="section-card dreams-section">
          <div className="section-header"><span className="eyebrow-caption">future dreams</span><h2>The Places We'll Go</h2></div>
          <div className="dreams-grid">
            {data.futureDreams.map((item, index) => (
              <button
                key={index}
                className={`dream-card ${dreamFlips[index] ? 'flipped' : ''}`}
                onClick={() => toggleDreamFlip(index)}
              >
                <div className="dream-inner">
                  <div className="dream-front">{item.emoji}</div>
                  <div className="dream-back">
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="section-card bucket-section">
          <div className="section-header"><span className="eyebrow-caption">together, still to come</span><h2>Our Bucket List</h2></div>
          <div className="bucket-list">
            {data.bucketList.map((item, index) => (
              <button
                className={`bucket-item ${checkedItems.includes(item) ? 'done' : ''}`}
                key={index}
                onClick={() => toggleBucket(item)}
              >
                <span className="bucket-check">✓</span>
                <span className="bucket-text">{item}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="section-card constellation-section">
          <div className="section-header"><span className="eyebrow-caption">floating memory stars</span><h2>A Sky Made of Us</h2></div>
          <div className="constellation-card">
            <canvas ref={starCanvasRef} className="star-canvas" onClick={handleStarClick} aria-label="Memory constellation" />
          </div>
          <p className="section-cta">tap a star to open a memory</p>
        </section>

        <section className="section-card finale-section">
          <div className="finale-canvas-wrap">
            <canvas ref={finaleCanvasRef} className="finale-canvas" aria-hidden="true" />
          </div>
          <div className="finale-copy">
            <p className="finale-line">No matter how many birthdays come,</p>
            <p className="finale-line">I'll always choose you.</p>
            <p className="finale-line finale-highlight">I love you forever.</p>
            <button className="finale-button" onClick={handleFinale}>One Last Click</button>
            {finalMessageVisible && <div className="final-message">{data.finalMessage}</div>}
          </div>
        </section>
      </main>

      {selectedPhoto && (
        <div className="lightbox" role="dialog" aria-modal="true" onClick={closePhoto}>
          <div className="lightbox-inner" onClick={(event) => event.stopPropagation()}>
            <img src={`/photos/${selectedPhoto.src}`} alt={selectedPhoto.alt} />
            <p>{selectedPhoto.cap}</p>
            <button className="close-button" onClick={closePhoto} aria-label="Close gallery">✕</button>
          </div>
        </div>
      )}

      {memoryPopup && (
        <div className="lightbox" role="dialog" aria-modal="true" onClick={() => setMemoryPopup(null)}>
          <div className="lightbox-inner" onClick={(event) => event.stopPropagation()}>
            {getMemoryGalleryPhoto(memoryPopup) && (
              <img
                src={`/photos/${getMemoryGalleryPhoto(memoryPopup)!.src}`}
                alt={getMemoryGalleryPhoto(memoryPopup)!.alt}
              />
            )}
            <h3>{memoryPopup.title}</h3>
            <p>{memoryPopup.text}</p>
            <button className="close-button" onClick={() => setMemoryPopup(null)} aria-label="Close memory popup">✕</button>
          </div>
        </div>
      )}

      {finalPageVisible && (
        <div className="final-page-overlay" role="dialog" aria-modal="true" onClick={() => setFinalPageVisible(false)}>
          <div className="final-page-inner" onClick={(event) => event.stopPropagation()}>
            <img
              src={`/photos/${data.gallery[data.finalPhotoIndex].src}`}
              alt={data.gallery[data.finalPhotoIndex].alt}
            />
            <div className="final-page-copy">
              <p className="final-page-tag">Our best chapter yet</p>
              <h2>A Sky Made of Us, A Life Made of You</h2>
              <p>{data.finalMessage}</p>
              <p className="final-page-love">I love you more than words, more than time, more than anything.</p>
              <button className="final-page-close" onClick={() => setFinalPageVisible(false)}>Close This Page</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
