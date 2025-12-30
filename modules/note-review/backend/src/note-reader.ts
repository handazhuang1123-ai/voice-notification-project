/**
 * 笔记读取器 - 只读访问 Obsidian 笔记
 *
 * 功能：
 * 1. 按时间筛选近期修改的笔记
 * 2. 提取笔记中的所有 [[链接]]
 * 3. 读取链接目标笔记的内容
 */

import * as fs from 'fs';
import * as path from 'path';

export interface NoteInfo {
    filename: string;
    filepath: string;
    content: string;
    modifiedTime: Date;
    links: string[];
    tags: string[];
}

export interface NoteContext {
    recentNotes: NoteInfo[];
    linkedNotes: NoteInfo[];
    allLinks: string[];
    missingLinks: string[];
}

export class NoteReader {
    private notesPath: string;
    private readonly LINK_PATTERN = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
    private readonly TAG_PATTERN = /#(\w+)/g;
    private readonly IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];

    constructor(notesPath: string) {
        this.notesPath = path.resolve(notesPath);
        if (!fs.existsSync(this.notesPath)) {
            throw new Error(`笔记目录不存在: ${this.notesPath}`);
        }
    }

    /**
     * 获取近期修改的笔记及其链接笔记
     */
    getRecentNotesWithLinks(days: number = 7): NoteContext {
        const recentNotes = this.getRecentNotes(days);
        const allLinks = new Set<string>();

        // 收集所有链接
        for (const note of recentNotes) {
            for (const link of note.links) {
                // 排除图片链接
                if (!this.isImageLink(link)) {
                    allLinks.add(link);
                }
            }
        }

        // 读取链接目标笔记
        const linkedNotes: NoteInfo[] = [];
        const missingLinks: string[] = [];

        for (const link of allLinks) {
            const linkedNote = this.readNote(link);
            if (linkedNote) {
                linkedNotes.push(linkedNote);
            } else {
                missingLinks.push(link);
            }
        }

        return {
            recentNotes,
            linkedNotes,
            allLinks: Array.from(allLinks),
            missingLinks
        };
    }

    /**
     * 获取近期修改的笔记
     */
    getRecentNotes(days: number): NoteInfo[] {
        const cutoffTime = new Date();
        cutoffTime.setDate(cutoffTime.getDate() - days);

        const notes: NoteInfo[] = [];
        const files = fs.readdirSync(this.notesPath);

        for (const file of files) {
            if (!file.endsWith('.md')) continue;

            const filepath = path.join(this.notesPath, file);
            const stats = fs.statSync(filepath);

            if (stats.mtime >= cutoffTime) {
                const content = fs.readFileSync(filepath, 'utf-8');
                notes.push({
                    filename: file.replace('.md', ''),
                    filepath,
                    content,
                    modifiedTime: stats.mtime,
                    links: this.extractLinks(content),
                    tags: this.extractTags(content)
                });
            }
        }

        // 按修改时间降序排序
        return notes.sort((a, b) => b.modifiedTime.getTime() - a.modifiedTime.getTime());
    }

    /**
     * 读取指定笔记
     */
    readNote(noteName: string): NoteInfo | null {
        const filepath = path.join(this.notesPath, `${noteName}.md`);

        if (!fs.existsSync(filepath)) {
            return null;
        }

        const content = fs.readFileSync(filepath, 'utf-8');
        const stats = fs.statSync(filepath);

        return {
            filename: noteName,
            filepath,
            content,
            modifiedTime: stats.mtime,
            links: this.extractLinks(content),
            tags: this.extractTags(content)
        };
    }

    /**
     * 提取笔记中的所有链接
     */
    private extractLinks(content: string): string[] {
        const links: string[] = [];
        let match;

        while ((match = this.LINK_PATTERN.exec(content)) !== null) {
            links.push(match[1]);
        }

        // 重置正则表达式
        this.LINK_PATTERN.lastIndex = 0;

        return [...new Set(links)];
    }

    /**
     * 提取笔记中的所有标签
     */
    private extractTags(content: string): string[] {
        const tags: string[] = [];
        let match;

        while ((match = this.TAG_PATTERN.exec(content)) !== null) {
            tags.push(match[1]);
        }

        this.TAG_PATTERN.lastIndex = 0;

        return [...new Set(tags)];
    }

    /**
     * 判断是否为图片链接
     */
    private isImageLink(link: string): boolean {
        const lowerLink = link.toLowerCase();
        return this.IMAGE_EXTENSIONS.some(ext => lowerLink.endsWith(ext));
    }

    /**
     * 获取笔记统计信息
     */
    getStats(): { total: number; withLinks: number; tags: Map<string, number> } {
        const files = fs.readdirSync(this.notesPath).filter(f => f.endsWith('.md'));
        let withLinks = 0;
        const tagCounts = new Map<string, number>();

        for (const file of files) {
            const content = fs.readFileSync(path.join(this.notesPath, file), 'utf-8');
            const links = this.extractLinks(content);
            const tags = this.extractTags(content);

            if (links.length > 0) withLinks++;

            for (const tag of tags) {
                tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
            }
        }

        return {
            total: files.length,
            withLinks,
            tags: tagCounts
        };
    }
}
