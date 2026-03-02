export type EditorLanguage =
  | 'cpp'
  | 'java'
  | 'python'
  | 'javascript'
  | 'typescript'
  | 'csharp'
  | 'go'
  | 'rust';

const DEFAULT_LANGUAGE: EditorLanguage = 'cpp';

export const LANGUAGE_OPTIONS: Array<{ value: EditorLanguage; label: string }> = [
  { value: 'cpp', label: 'C++' },
  { value: 'java', label: 'Java' },
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'csharp', label: 'C#' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
];

const PRESETS: Record<EditorLanguage, string> = {
  cpp: `// Write your solution here
#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    // Your code here
};
`,
  java: `// Write your solution here
import java.util.*;

class Solution {
    public void solve() {
        // Your code here
    }
}
`,
  python: `# Write your solution here
class Solution:
    def solve(self):
        # Your code here
        pass
`,
  javascript: `// Write your solution here
function solve() {
  // Your code here
}
`,
  typescript: `// Write your solution here
function solve(): void {
  // Your code here
}
`,
  csharp: `// Write your solution here
using System;

public class Solution {
    public void Solve() {
        // Your code here
    }
}
`,
  go: `// Write your solution here
package main

func solve() {
    // Your code here
}
`,
  rust: `// Write your solution here
struct Solution;

impl Solution {
    fn solve() {
        // Your code here
    }
}
`,
};

export function normalizeEditorLanguage(value?: string): EditorLanguage {
  return LANGUAGE_OPTIONS.some(option => option.value === value) ? (value as EditorLanguage) : DEFAULT_LANGUAGE;
}

export function getLanguagePreset(language?: string): string {
  return PRESETS[normalizeEditorLanguage(language)];
}

export function isCodePreset(code: string, language?: string): boolean {
  return code.trim() === getLanguagePreset(language).trim();
}
