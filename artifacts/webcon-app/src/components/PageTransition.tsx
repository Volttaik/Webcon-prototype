import { type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

type PageTransitionProps = {
  children: ReactNode;
  className?: string;
};

const variants = {
  initial: {
    opacity: 0,
    y: 10,
    filter: 'blur(3px)',
    scale: 0.995,
  },
  animate: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    scale: 1,
    transition: {
      duration: 0.38,
      ease: [0.22, 1, 0.36, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -6,
    filter: 'blur(2px)',
    scale: 0.998,
    transition: {
      duration: 0.22,
      ease: [0.36, 0, 0.66, 0],
    },
  },
};

export default function PageTransition({ children, className }: PageTransitionProps) {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={cn('will-change-transform', className)}
        style={{ transformOrigin: 'center top' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
