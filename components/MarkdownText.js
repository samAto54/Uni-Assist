/**
 * components/MarkdownText.js
 *
 * Lightweight markdown renderer for chat bubbles.
 * Supports:
 *   **bold**  _italic_  `code`
 *   # H1  ## H2  ### H3
 *   - bullet  * bullet
 *   1. numbered list
 *   > blockquote
 *   blank lines → paragraph breaks
 *
 * Usage:
 *   <MarkdownText text={message} style={styles.aiText} />
 */

import React from 'react';
import { Text, View, StyleSheet, Platform } from 'react-native';

// ── Inline parser: bold / italic / code ──────────────────────────────────────
function parseInline(raw, baseStyle, key) {
    // Split on **bold**, _italic_, `code`
    const parts = raw.split(/(\*\*[^*]+\*\*|_[^_]+_|`[^`]+`)/g);
    return (
        <Text key={key} style={baseStyle}>
            {parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return (
                        <Text key={`${part}-${i}`} style={[baseStyle, styles.bold]}>
                            {part.slice(2, -2)}
                        </Text>
                    );
                }
                if (part.startsWith('_') && part.endsWith('_') && part.length > 2) {
                    return (
                        <Text key={`${part}-${i}`} style={[baseStyle, styles.italic]}>
                            {part.slice(1, -1)}
                        </Text>
                    );
                }
                if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
                    return (
                        <Text key={`${part}-${i}`} style={[baseStyle, styles.code]}>
                            {part.slice(1, -1)}
                        </Text>
                    );
                }
                return <Text key={`${part}-${i}`} style={baseStyle}>{part}</Text>;
            })}
        </Text>
    );
}

// ── Block renderer ────────────────────────────────────────────────────────────
export default function MarkdownText({ text, style, dimStyle }) {
    if (!text) return null;

    const base  = [styles.base, style];
    const dim   = [styles.base, dimStyle || style];

    const lines  = text.split('\n');
    const blocks = [];
    let listItems   = [];   // pending bullet items
    let numItems    = [];   // pending numbered items
    let listType    = null; // 'bullet' | 'number'

    const flushList = () => {
        if (listItems.length > 0) {
            blocks.push(
                <View key={`list-${blocks.length}`} style={styles.list}>
                    {listItems.map((item, i) => (
                        <View key={`${item}-${i}`} style={styles.bulletRow}>
                            <Text style={[styles.base, style, styles.bulletDot]}>•</Text>
                            {parseInline(item, base, `bi-${i}`)}
                        </View>
                    ))}
                </View>
            );
            listItems = [];
        }
        if (numItems.length > 0) {
            blocks.push(
                <View key={`num-${blocks.length}`} style={styles.list}>
                    {numItems.map((item, i) => (
                        <View key={`${item}-${i}`} style={styles.bulletRow}>
                            <Text style={[styles.base, style, styles.numLabel]}>{i + 1}.</Text>
                            {parseInline(item, base, `ni-${i}`)}
                        </View>
                    ))}
                </View>
            );
            numItems = [];
        }
        listType = null;
    };

    lines.forEach((raw, idx) => {
        const line = raw.trimEnd();

        // Blank line — flush list, add spacer
        if (line.trim() === '') {
            flushList();
            blocks.push(<View key={`sp-${idx}`} style={styles.spacer} />);
            return;
        }

        // Headings
        const h3 = line.match(/^###\s+(.*)/);
        const h2 = line.match(/^##\s+(.*)/);
        const h1 = line.match(/^#\s+(.*)/);
        if (h1 || h2 || h3) {
            flushList();
            const content = (h1 || h2 || h3)[1];
            const hStyle  = h1 ? styles.h1 : h2 ? styles.h2 : styles.h3;
            blocks.push(
                <Text key={idx} style={[styles.base, style, hStyle]}>
                    {content}
                </Text>
            );
            return;
        }

        // Blockquote
        const bq = line.match(/^>\s+(.*)/);
        if (bq) {
            flushList();
            blocks.push(
                <View key={idx} style={styles.blockquote}>
                    {parseInline(bq[1], dim, `bq-${idx}`)}
                </View>
            );
            return;
        }

        // Bullet list
        const bullet = line.match(/^[-*]\s+(.*)/);
        if (bullet) {
            if (listType === 'number') flushList();
            listType = 'bullet';
            listItems.push(bullet[1]);
            return;
        }

        // Numbered list
        const numbered = line.match(/^\d+\.\s+(.*)/);
        if (numbered) {
            if (listType === 'bullet') flushList();
            listType = 'number';
            numItems.push(numbered[1]);
            return;
        }

        // Plain paragraph
        flushList();
        blocks.push(
            <View key={idx} style={styles.para}>
                {parseInline(line, base, `p-${idx}`)}
            </View>
        );
    });

    flushList(); // flush any trailing list

    return <View>{blocks}</View>;
}

const styles = StyleSheet.create({
    base: { fontSize: 15, lineHeight: 22 },
    bold: { fontWeight: '700' },
    italic: { fontStyle: 'italic' },
    code: {
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        backgroundColor: 'rgba(0,0,0,0.07)',
        borderRadius: 4,
        paddingHorizontal: 4,
        fontSize: 13,
    },
    h1: { fontSize: 20, fontWeight: '900', marginBottom: 4, marginTop: 4 },
    h2: { fontSize: 17, fontWeight: '800', marginBottom: 2, marginTop: 4 },
    h3: { fontSize: 15, fontWeight: '700', marginBottom: 2, marginTop: 2 },
    para: { marginBottom: 2 },
    spacer: { height: 8 },
    list: { marginBottom: 4, gap: 6 },
    bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    bulletDot: { fontWeight: '700', lineHeight: 22, width: 14 },
    numLabel: { fontWeight: '700', lineHeight: 22, width: 22 },
    blockquote: {
        borderLeftWidth: 3,
        borderLeftColor: '#9fb3c8',
        paddingLeft: 10,
        marginVertical: 4,
        opacity: 0.8,
    },
});
