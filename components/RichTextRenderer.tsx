import React from 'react';

interface RichTextRendererProps {
    content: string;
    className?: string;
}

export const RichTextRenderer: React.FC<RichTextRendererProps> = React.memo(({ content, className = '' }) => {
    if (!content) return null;

    // 1. Split by newlines first to preserve paragraph structure
    const lines = content.split('\n');

    return (
        <div className={`whitespace-pre-wrap break-words ${className}`}>
            {lines.map((line, lineIndex) => (
                <React.Fragment key={lineIndex}>
                    {renderLine(line)}
                    {lineIndex < lines.length - 1 && '\n'}
                </React.Fragment>
            ))}
        </div>
    );
});

RichTextRenderer.displayName = 'RichTextRenderer';

const renderLine = (text: string) => {
    // Regex for:
    // 1. URLs (http/https)
    // 2. Bold (**text**)
    // We split by these patterns to creates token chunks
    const parts = text.split(/(\*\*[^*]+\*\*|https?:\/\/[^\s]+)/g);

    return parts.map((part, index) => {
        if (part.startsWith('http')) {
            return (
                <a
                    key={index}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                >
                    {part}
                </a>
            );
        } else if (part.startsWith('**') && part.endsWith('**')) {
            return (
                <strong key={index} className="font-bold text-indigo-300">
                    {part.slice(2, -2)}
                </strong>
            );
        }
        return part;
    });
};
