import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './MarkdownReport.module.css';

interface Props {
  content: string;
  clamped?: boolean;
}

export function MarkdownReport({ content, clamped }: Props) {
  return (
    <div className={`${styles.md} ${clamped ? styles.clamp : ''}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
