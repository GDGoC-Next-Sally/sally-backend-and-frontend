import styles from './PageContainer.module.css';

interface Props {
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({ children, className }: Props) {
  return (
    <div className={`${styles.container}${className ? ` ${className}` : ''}`}>
      {children}
    </div>
  );
}
