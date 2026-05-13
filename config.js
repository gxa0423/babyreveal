/*
  Baby Reveal settings
  1) Replace coupleNames, babyNickname, and photoCaption.
  2) Replace assets/baby-photo.jpg with your baby image, or change babyPhotoSrc.
  3) Change revealSex to "XX" or "XY" for the no-database version.
  4) For shared voting, set useSupabase to true after running supabase_setup.sql.
*/

window.BABY_REVEAL_CONFIG = {
  coupleNames: "our little family",
  babyNickname: "Our Little One",
  photoCaption: "Our baby at 11w4d :)",

  // Passcode gate: default passcode is ...
  // This is a casual privacy layer for friends, not server-side authentication.
  enablePasscode: true,
  passcodeHash: "30bc372166975a9d5e80a0132a1660594c64bff7edf1b764450a1296696414e7",
  passcodeHint: "Hint: ask us for the magic word.",

  // No-database fallback. Anyone technical can see this in the source.
  // To keep the answer out of the public code, use the Supabase option below.
  revealSex: "XY",

  // Photo: upload your image as assets/baby-photo.jpg, or change this path.
  babyPhotoSrc: "assets/baby-photo.jpg",
  fallbackPhotoSrc: "assets/baby.jpg",


  // Chromosome icon artwork. Replace these PNGs in assets/ or change paths here.
  chromosomeImages: {
    XX: "assets/chromosomes-xx.png",
    XY: "assets/chromosomes-xy.png"
  },

  // Shared vote tracking. Leave off for local-only demo mode.
  useSupabase: true,
  supabaseUrl: "https://yampemvfnnxiboashlnc.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhbXBlbXZmbm54aWJvYXNobG5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MjM3MDgsImV4cCI6MjA5NDE5OTcwOH0.9KyHQxPNq_yAi8sqwSWJU3twYxqi3VrWymHPpKUoRHc",

  // Floating hearts in the background. Add/remove/move these manually.
  // Use top/bottom + left/right like "24%" or "180px". Size is pixels.
  decorHearts: [
    { top: "8%", left: "12%", size: 15, rotate: -12, opacity: 0.30 },
    { top: "10%", right: "16%", size: 12, rotate: 16, opacity: 0.24 },
    { top: "18%", left: "31%", size: 13, rotate: 9, opacity: 0.25 },
    { top: "23%", right: "35%", size: 18, rotate: -8, opacity: 0.28 },
    { top: "30%", left: "7%", size: 21, rotate: 10, opacity: 0.30 },
    { top: "37%", right: "9%", size: 16, rotate: 12, opacity: 0.26 },
    { top: "44%", left: "22%", size: 12, rotate: -7, opacity: 0.22 },
    { top: "52%", left: "58%", size: 20, rotate: -12, opacity: 0.27 },
    { top: "59%", right: "20%", size: 14, rotate: 8, opacity: 0.23 },
    { top: "66%", left: "10%", size: 16, rotate: -16, opacity: 0.26 },
    { top: "73%", right: "12%", size: 18, rotate: 14, opacity: 0.25 },
    { top: "82%", left: "35%", size: 13, rotate: 9, opacity: 0.22 }
  ],

  voteLabels: {
    XX: "Girl",
    XY: "Boy"
  },

  revealText: {
    XX: {
      headline: "It's a girl!",
      message: "Thanks for rejoicing with us ♥"
    },
    XY: {
      headline: "It's a boy!",
      message: "Thanks for rejoicing with us ♥"
    }
  }
};


document.addEventListener("keydown", function (e) {
  // Press: Shift + R + E
  if (e.shiftKey && e.key.toLowerCase() === "e") {
    const confirmReset = confirm("Reset all test votes?");
    if (confirmReset) {
      localStorage.clear();
      location.reload();
    }
  }
});
