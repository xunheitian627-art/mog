
import React, { useState, useEffect, useRef } from "react";

type MoleType = "normal" | "gold" | "bomb";

type Mole = {
  type: MoleType;
  expiresAt: number;
  id: number;
};

const GAME_TIME = 45;

const initialMoles: (Mole | null)[] = Array(9).fill(null);

export default function App() {
  const [moles, setMoles] = useState<(Mole | null)[]>(initialMoles);
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(GAME_TIME);
  const [combo, setCombo] = useState(0);
  const [best, setBest] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [finished, setFinished] = useState(false);
  const [message, setMessage] = useState("ゲームスタート！");
  const [hitId, setHitId] = useState<number | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spawnRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextId = useRef(0);
  const audioRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("mole-best-score");
    if (saved) setBest(Number(saved));

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (spawnRef.current) clearInterval(spawnRef.current);
    };
  }, []);

  function sound(frequency: number, duration = 0.12) {
    try {
      if (!audioRef.current) {
        audioRef.current = new AudioContext();
      }

      const ctx = audioRef.current;

      if (ctx.state === "suspended") {
        void ctx.resume();
      }

      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = frequency;

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + duration
      );

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      oscillator.start();
      oscillator.stop(ctx.currentTime + duration);
    } catch {
      // 音声が利用できない環境ではゲームを続行
    }
  }

  function stopGame() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (spawnRef.current) clearInterval(spawnRef.current);

    timerRef.current = null;
    spawnRef.current = null;

    setPlaying(false);
    setFinished(true);
    setMoles(initialMoles);
    setMessage("ゲーム終了！");
    sound(400, 0.3);
  }

  function startGame() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (spawnRef.current) clearInterval(spawnRef.current);

    setScore(0);
    setTime(GAME_TIME);
    setCombo(0);
    setMoles(initialMoles);
    setFinished(false);
    setPlaying(true);
    setMessage("もぐらをたたこう！");
    setHitId(null);
    nextId.current = 0;

    sound(660);

    timerRef.current = setInterval(() => {
      setTime((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          if (spawnRef.current) clearInterval(spawnRef.current);

          timerRef.current = null;
          spawnRef.current = null;

          setPlaying(false);
          setFinished(true);
          setMoles(initialMoles);
          setMessage("ゲーム終了！");

          sound(400, 0.3);

          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    spawnRef.current = setInterval(() => {
      const now = Date.now();

      setMoles((prev) => {
        const next = prev.map((mole) => {
          if (mole && mole.expiresAt <= now) return null;
          return mole;
        });

        const empty = next
          .map((mole, index) => mole === null ? index : -1)
          .filter((index) => index !== -1);

        if (empty.length === 0) return next;

        const position = empty[
          Math.floor(Math.random() * empty.length)
        ];

        const random = Math.random();

        let type: MoleType = "normal";

        if (random < 0.12) {
          type = "gold";
        } else if (random < 0.25) {
          type = "bomb";
        }

        next[position] = {
          type,
          expiresAt: now + 1100,
          id: ++nextId.current,
        };

        return next;
      });
    }, 650);
  }

  function hitMole(index: number) {
    if (!playing) return;

    const mole = moles[index];

    if (!mole) return;

    setMoles((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });

    setHitId(mole.id);

    if (mole.type === "bomb") {
      setScore((prev) => Math.max(0, prev - 20));
      setCombo(0);
      setMessage("💣 爆弾！ -20点");
      sound(130, 0.2);
      return;
    }

    const points = mole.type === "gold" ? 30 : 10;

    setCombo((prev) => {
      const next = prev + 1;

      if (next % 5 === 0) {
        setScore((current) => current + points + 20);
        setMessage(`🔥 ${next} COMBO！ ボーナス +20点`);
        sound(1000, 0.18);
      } else {
        setScore((current) => current + points);
        setMessage(
          mole.type === "gold"
            ? "🌟 ゴールド！ +30点"
            : "✨ ナイス！ +10点"
        );
        sound(750, 0.1);
      }

      return next;
    });
  }

  useEffect(() => {
    if (score > best) {
      setBest(score);
      localStorage.setItem("mole-best-score", String(score));
    }
  }, [score, best]);

  return (
    <div className="game">
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #fff4d8;
          font-family: Arial, "Meiryo", sans-serif;
        }

        .game {
          min-height: 100vh;
          padding: 25px 12px 40px;
          text-align: center;
          background: radial-gradient(circle at top, #fffde8, #ffe4ae);
          color: #57351d;
        }

        .title {
          font-size: clamp(28px, 6vw, 48px);
          font-weight: 900;
          color: #e66b2e;
          text-shadow: 2px 3px #ffd36d;
          margin: 5px 0;
        }

        .subtitle {
          color: #a36b39;
          margin-bottom: 20px;
          font-weight: bold;
        }

        .status {
          display: flex;
          justify-content: center;
          gap: 10px;
          flex-wrap: wrap;
          margin: 15px auto;
          max-width: 500px;
        }

        .status-box {
          background: white;
          border: 3px solid #ffc76a;
          border-radius: 16px;
          padding: 10px 18px;
          min-width: 100px;
          box-shadow: 0 4px 0 #e9ae57;
        }

        .status-box small {
          display: block;
          color: #aa8051;
          font-size: 12px;
        }

        .status-box strong {
          display: block;
          font-size: 25px;
          color: #e56b2d;
        }

        .timer strong {
          color: #e34a4a;
        }

        .message {
          margin: 20px auto;
          min-height: 35px;
          font-size: 19px;
          font-weight: bold;
          color: #c65a27;
        }

        .field {
          width: min(100%, 440px);
          margin: 0 auto;
          padding: 18px;
          border-radius: 28px;
          background: #80c95a;
          border: 8px solid #a66a39;
          box-shadow: 0 9px 0 #774725, inset 0 0 20px #4e9d3e;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .hole {
          aspect-ratio: 1;
          border-radius: 50%;
          background: #633c25;
          box-shadow: inset 0 9px 10px #392115, 0 4px 0 #b7e27d;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border: none;
          padding: 0;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }

        .mole {
          position: absolute;
          font-size: clamp(42px, 10vw, 65px);
          line-height: 1;
          animation: pop 0.22s ease-out;
          user-select: none;
          pointer-events: none;
        }

        @keyframes pop {
          from {
            transform: translateY(70%) scale(.5);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }

        .gold {
          filter: drop-shadow(0 0 8px gold);
        }

        .bomb {
          animation: bomb 0.5s infinite alternate;
        }

        @keyframes bomb {
          from { transform: scale(.9); }
          to { transform: scale(1.1); }
        }

        .start-button {
          margin: 25px 0 15px;
          padding: 15px 45px;
          border: none;
          border-radius: 50px;
          background: #ff763c;
          color: white;
          font-size: 21px;
          font-weight: bold;
          cursor: pointer;
          box-shadow: 0 6px 0 #c64c25;
          transition: transform .15s;
        }

        .start-button:active {
          transform: translateY(5px);
          box-shadow: 0 1px 0 #c64c25;
        }

        .rules {
          max-width: 440px;
          margin: 20px auto;
          padding: 15px;
          border-radius: 18px;
          background: #fff;
          text-align: left;
          line-height: 1.9;
          font-size: 14px;
          box-shadow: 0 3px 10px #d9ad75;
        }

        .rules h3 {
          text-align: center;
          color: #e66b2e;
          margin: 0 0 8px;
        }

        .result {
          color: #e66b2e;
          font-size: 24px;
          font-weight: bold;
          margin-top: 12px;
        }

        @media (max-width: 380px) {
          .field {
            padding: 10px;
            gap: 8px;
          }

          .status-box {
            padding: 8px 12px;
            min-width: 85px;
          }
        }
      `}</style>

      <h1 className="title">🐹 もぐらたたき！</h1>
      <div className="subtitle">
        たくさん叩いてハイスコアを目指そう！
      </div>

      <div className="status">
        <div className="status-box">
          <small>🏆 SCORE</small>
          <strong>{score}</strong>
        </div>

        <div className="status-box timer">
          <small>⏰ TIME</small>
          <strong>{time}</strong>
        </div>

        <div className="status-box">
          <small>🔥 COMBO</small>
          <strong>{combo}</strong>
        </div>
      </div>

      <div className="status-box" style={{ display: "inline-block" }}>
        <small>👑 BEST SCORE</small>
        <strong>{best}</strong>
      </div>

      <div className="message" aria-live="polite">
        {message}
      </div>

      <div className="field">
        {moles.map((mole, index) => (
          <button
            key={index}
            className="hole"
            onPointerDown={() => hitMole(index)}
            aria-label={`もぐらの穴 ${index + 1}`}
            disabled={!playing || !mole}
          >
            {mole && (
              <span
                key={mole.id}
                className={`mole ${
                  mole.type === "gold"
                    ? "gold"
                    : mole.type === "bomb"
                    ? "bomb"
                    : "normal"
                }`}
              >
                {mole.type === "gold"
                  ? "🐹"
                  : mole.type === "bomb"
                  ? "💣"
                  : "🐹"}
              </span>
            )}
          </button>
        ))}
      </div>

      <button
        className="start-button"
        onClick={startGame}
        disabled={playing}
        style={{
          opacity: playing ? 0.55 : 1,
          cursor: playing ? "not-allowed" : "pointer",
        }}
      >
        {playing
          ? "ゲーム中..."
          : finished
          ? "もう一度遊ぶ！"
          : "ゲームスタート！"}
      </button>

      {finished && (
        <div className="result">
          🎉 最終スコア：{score} 点
        </div>
      )}

      <div className="rules">
        <h3>🎮 あそびかた</h3>
        🐹 普通のもぐら：10点<br />
        🌟 金色のもぐら：30点<br />
        💣 爆弾：20点マイナス<br />
        🔥 5連続ヒット：ボーナス20点<br />
        ⏰ 制限時間：45秒
      </div>
    </div>
  );
}
