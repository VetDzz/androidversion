import { motion } from "framer-motion";

export default function PulsingCircle() {
  return (
    <div className="absolute bottom-8 right-8 z-30">
      <div className="relative w-20 h-20 flex items-center justify-center">
        {/* Pulsing Border Ring - CSS based */}
        <motion.div
          className="absolute w-[60px] h-[60px] rounded-full border-2 border-blue-400"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.8, 0.4, 0.8],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute w-[60px] h-[60px] rounded-full border-2 border-blue-500"
          animate={{
            scale: [1.1, 1, 1.1],
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full overflow-hidden">
            <img
              src="/images/Logo.jpeg"
              alt="VetDz Logo"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <motion.svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          animate={{ rotate: 360 }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{ transform: "scale(1.6)" }}
        >
          <defs>
            <path id="circle" d="M 50, 50 m -38, 0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0" />
          </defs>
          <text className="text-sm fill-white/80">
            <textPath href="#circle" startOffset="0%">
              VetDz • Your Pet Care Partner • VetDz • Your Pet Care Partner •
            </textPath>
          </text>
        </motion.svg>
      </div>
    </div>
  );
}
