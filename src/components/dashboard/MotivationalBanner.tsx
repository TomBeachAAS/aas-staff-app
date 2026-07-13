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
  "While they sleep, you grind. While they party, you build. 😤",
  "Pain is temporary. Quitting lasts forever. 🦾",
  "You didn't come this far to only come this far. 🔱",
  "Average is a choice. You're better than that. 💥",
  "Your competition is already working. What are you doing? ⚡",
  "Nobody cares about your excuses. Get it done. 🎯",
  "Champions are made when nobody is watching. 👁️",
  "The grind doesn't stop. Neither do you. 🔄",
  "Outwork everyone in the room. Every. Single. Day. 💯",
  "Comfort is the enemy of greatness. Get uncomfortable. 🔥",
  "Every second you waste, someone else is gaining on you. ⏱️",
  "Be so good they can't ignore you. 🌪️",
  "Discipline is choosing what you want most over what you want now. ⚔️",
  "Success isn't given. It's taken — every morning. 🌅",
  "You are one decision away from a completely different life. 🚀",
  "Don't wish it were easier. Wish you were better. 💎",
  "The harder you work, the luckier you get. Coincidence? 🍀",
  "Fear is a liar. Push through it. 🛡️",
  "Your future self is watching. Don't let them down. 🔭",
  "Tired? Good. That means you're working. Keep going. 🏋️",
  "The only bad workout is the one that didn't happen. 💪",
  "Winners find a way. Losers find an excuse. Which are you? 🏆",
  "It's supposed to be hard. That's why it's worth it. ⛰️",
  "You've survived 100% of your worst days. Today's no different. 🧱",
  "Make today so productive it embarrasses yesterday. 📈",
  "The moment you want to quit is the moment you need to push harder. 💣",
  "Either you run the day, or the day runs you. Choose. ⚡",
  "Stop waiting for the right moment. Create it. 🔨",
  "There is no off-season for excellence. 🥇",
  "Mediocrity will never get you where you want to go. Rise up. 🦅",
  "Work like there's someone always trying to take your place. 🔒",
  "Don't count the days. Make the days count. ✊",
  "You're not tired — you're just at the point where it gets good. 🎯",
  "Pressure makes diamonds. Welcome the pressure. 💎",
  "Success is rented, not owned. And rent is due every day. 📅",
  "One more rep. One more call. One more hour. That's the difference. ⚙️",
  "Go so hard that rest feels earned — not taken. 😴",
  "If it doesn't challenge you, it doesn't change you. 🌊",
];

const VIDEOS = [
  'https://www.youtube.com/watch?v=ZXsQAXx_ao0', // Shia LaBeouf — Just Do It
  'https://www.youtube.com/watch?v=lsSC2vx7zFQ', // Eric Thomas — How Bad Do You Want It
  'https://www.youtube.com/watch?v=pxBQLFLei70', // Admiral McRaven — Make Your Bed
  'https://www.youtube.com/watch?v=D_Vg4uyYwEk', // Rocky Balboa — speech to his son
  'https://www.youtube.com/watch?v=u_ktRTWMX3M', // Arnold Schwarzenegger — 6 Rules of Success
  'https://www.youtube.com/watch?v=ka4BQRXhASs', // Les Brown — Live Your Dreams
  'https://www.youtube.com/watch?v=mgmVOuLgFB0', // Shia LaBeouf — JUST DO IT (original)
  'https://www.youtube.com/watch?v=7Hb4W5TxNIE', // Eric Thomas — Secrets to Success
  'https://www.youtube.com/watch?v=IOt_pd7SCNU', // Goggins — Can't Hurt Me
  'https://www.youtube.com/watch?v=6vuetQSwFW8', // Denzel Washington — Fall Forward
];

function randomVideo() {
  return VIDEOS[Math.floor(Math.random() * VIDEOS.length)];
}

export function MotivationalBanner() {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * MESSAGES.length));
  const [visible, setVisible] = useState(true);
  const [video] = useState(randomVideo);

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
    <a href={video} target="_blank" rel="noopener noreferrer" className="block bg-gradient-to-r from-aas-blue to-blue-500 rounded-xl px-4 py-3 cursor-pointer">
      <p
        className="text-white text-sm font-medium text-center transition-opacity duration-300 select-none"
        style={{ opacity: visible ? 1 : 0 }}
      >
        {MESSAGES[index]}
      </p>
    </a>
  );
}
