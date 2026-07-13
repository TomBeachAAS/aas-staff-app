'use client';

import { useState, useEffect } from 'react';

const MESSAGES = [
  "Keep pushing — great things take time! 💪",
  "Hard work always pays off! 🌟",
  "One task at a time, one day at a time! ✅",
  "Your effort today shapes tomorrow! 🚀",
  "You're doing great — keep it up! 🎯",
  "Every day is a chance to be better! ⭐",
  "Small steps lead to big results! 🌱",
  "Stay focused, stay driven! 🏆",
  "The team is stronger with you in it! 🤝",
  "Good work never goes unnoticed! 👏",
  "Another day, another opportunity! ☀️",
  "Progress over perfection — always! 🔥",
];

export function MotivationalBanner() {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * MESSAGES.length));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex(i => (i + 1) % MESSAGES.length);
        setVisible(true);
      }, 400);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gradient-to-r from-aas-blue to-blue-500 rounded-xl px-4 py-3">
      <p
        className="text-white text-sm font-medium text-center transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
      >
        {MESSAGES[index]}
      </p>
    </div>
  );
}
