
import { motion } from 'framer-motion';

export const Footer = () => {
  return (
    <motion.footer
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.4 }}
      className="w-full max-w-3xl mx-auto mt-8 mb-4"
    >
      {/* Footer content removed as requested */}
    </motion.footer>
  );
};
