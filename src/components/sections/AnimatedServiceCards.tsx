'use client'

import { motion } from 'framer-motion'

type ServiceCard = {
  icon: string
  href: string
  title: string
  description: string
  features: string[]
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] } },
}

export function AnimatedServiceCards({ services }: { services: ServiceCard[] }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      variants={containerVariants}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: 28,
      }}
    >
      {services.map((service) => (
        <motion.div
          key={service.title}
          variants={cardVariants}
          whileHover={{ y: -5, boxShadow: '0 12px 40px rgba(0,0,0,0.10)', transition: { duration: 0.18 } }}
          style={{ borderRadius: 16 }}
        >
          <a href={service.href} style={{
            background: '#fff',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: '32px 28px',
            display: 'flex',
            flexDirection: 'column',
            textDecoration: 'none',
            height: '100%',
            transition: 'border-color 0.22s',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: 16 }}>{service.icon}</div>
            <h2 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1.1rem', marginBottom: 12, lineHeight: 1.35 }}>
              {service.title}
            </h2>
            <p style={{ color: 'var(--slate)', fontSize: '0.93rem', lineHeight: 1.65, marginBottom: 20, flex: 1 }}>
              {service.description}
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {service.features.map((f) => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--slate)', fontSize: '0.88rem' }}>
                  <span style={{ color: 'var(--teal)', fontWeight: 700 }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </a>
        </motion.div>
      ))}
    </motion.div>
  )
}
