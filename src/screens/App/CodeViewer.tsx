import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  ScrollView,
  Platform,
  Image,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppStackParamList } from '../../routes/types';
import api from '../../utils/api';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import Clipboard from '@react-native-clipboard/clipboard';
import { Buffer } from 'buffer';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import Markdown from 'react-native-markdown-display';
import { preprocessMarkdown, markdownStyles } from './Details';

type CodeViewerRouteProp = RouteProp<AppStackParamList, 'CodeViewer'>;

const langMap: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  rb: 'ruby',
  go: 'go',
  rs: 'rust',
  java: 'java',
  cpp: 'cpp',
  c: 'c',
  cs: 'csharp',
  php: 'php',
  html: 'xml',
  css: 'css',
  json: 'json',
  md: 'markdown',
  sh: 'bash',
  yml: 'yaml',
  yaml: 'yaml',
};

// Simple keyword-based syntax coloring for common languages
const KEYWORD_COLORS: Record<string, string> = {
  keyword: '#d73a49',
  string: '#032f62',
  comment: '#6a737d',
  number: '#005cc5',
  punctuation: '#24292e',
  default: '#24292e',
};

const KEYWORDS = new Set([
  'import',
  'export',
  'from',
  'default',
  'const',
  'let',
  'var',
  'function',
  'return',
  'if',
  'else',
  'for',
  'while',
  'do',
  'switch',
  'case',
  'break',
  'continue',
  'new',
  'this',
  'class',
  'extends',
  'super',
  'try',
  'catch',
  'finally',
  'throw',
  'async',
  'await',
  'yield',
  'of',
  'in',
  'typeof',
  'instanceof',
  'void',
  'delete',
  'true',
  'false',
  'null',
  'undefined',
  'interface',
  'type',
  'enum',
  'implements',
  'package',
  'private',
  'protected',
  'public',
  'static',
  'readonly',
  'abstract',
  'as',
  'is',
  'keyof',
  'def',
  'self',
  'None',
  'True',
  'False',
  'lambda',
  'pass',
  'raise',
  'with',
  'elif',
  'except',
  'print',
  'and',
  'or',
  'not',
  'fn',
  'pub',
  'mod',
  'use',
  'struct',
  'impl',
  'trait',
  'mut',
  'ref',
  'func',
  'go',
  'chan',
  'map',
  'range',
  'defer',
  'select',
]);

function tokenizeLine(line: string): { text: string; color: string }[] {
  const tokens: { text: string; color: string }[] = [];
  // Simple regex-based tokenizer
  const regex =
    /(\/\/.*$|#.*$|\/\*[\s\S]*?\*\/|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\b\d+\.?\d*\b|\b[a-zA-Z_]\w*\b|[^\s]|\s+)/g;
  let match;

  while ((match = regex.exec(line)) !== null) {
    const token = match[0];
    let color = KEYWORD_COLORS.default;

    if (
      token.startsWith('//') ||
      token.startsWith('#') ||
      token.startsWith('/*')
    ) {
      color = KEYWORD_COLORS.comment;
    } else if (
      token.startsWith('"') ||
      token.startsWith("'") ||
      token.startsWith('`')
    ) {
      color = KEYWORD_COLORS.string;
    } else if (/^\d/.test(token)) {
      color = KEYWORD_COLORS.number;
    } else if (KEYWORDS.has(token)) {
      color = KEYWORD_COLORS.keyword;
    }

    tokens.push({ text: token, color });
  }

  if (tokens.length === 0) {
    tokens.push({ text: line, color: KEYWORD_COLORS.default });
  }

  return tokens;
}

interface CodeLineProps {
  lineNumber: number;
  lineText: string;
  fontSize: number;
  totalLines: number;
}

const CodeLine = React.memo(
  ({ lineNumber, lineText, fontSize, totalLines }: CodeLineProps) => {
    const gutterWidth = Math.max(
      String(totalLines).length * (fontSize * 0.65),
      28,
    );
    const tokens = tokenizeLine(lineText);

    return (
      <View style={styles.codeLine}>
        <View style={[styles.lineNumberGutter, { width: gutterWidth }]}>
          <Text
            style={[styles.lineNumber, { fontSize, lineHeight: fontSize + 6 }]}
          >
            {lineNumber}
          </Text>
        </View>
        <Text
          style={[styles.lineContent, { fontSize, lineHeight: fontSize + 6 }]}
        >
          {tokens.map((token, i) => (
            <Text key={i} style={{ color: token.color }}>
              {token.text}
            </Text>
          ))}
        </Text>
      </View>
    );
  },
);

export default function CodeViewer() {
  const route = useRoute<CodeViewerRouteProp>();
  const navigation = useNavigation<any>();
  const { owner, repo, path, sha, branch } = route.params;

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [baseFontSize, setBaseFontSize] = useState(12);

  const ext = path.split('.').pop()?.toLowerCase() || '';
  const language = langMap[ext] || 'text';

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const lines = useMemo(() => code.split('\n'), [code]);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const res = await api.get(`/repos/${owner}/${repo}/git/blobs/${sha}`);
        if (res.content) {
          const decoded = Buffer.from(res.content, 'base64').toString('utf-8');
          setCode(decoded);
        }
      } catch (err) {
        console.warn('Failed to fetch code:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, [owner, repo, sha]);

  const copyToClipboard = () => {
    Clipboard.setString(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openInBrowser = () => {
    const url = `https://github.com/${owner}/${repo}/blob/${branch}/${path}`;
    Linking.openURL(url);
  };

  const handleZoomIn = () => setBaseFontSize(prev => Math.min(24, prev + 2));
  const handleZoomOut = () => setBaseFontSize(prev => Math.max(8, prev - 2));

  const pinchGesture = Gesture.Pinch()
    .onUpdate(e => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color="#000" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.filename} numberOfLines={1}>
              {path.split('/').pop()}
            </Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{language}</Text>
            </View>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconBtnSmall}
            onPress={copyToClipboard}
          >
            <Ionicons
              name={copied ? 'checkmark' : 'copy-outline'}
              size={20}
              color={copied ? '#22c55e' : '#000'}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtnSmall} onPress={openInBrowser}>
            <Ionicons name="open-outline" size={20} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Toolbar for Zooming */}
      {/* <View style={styles.toolbar}>
        <View style={styles.toolbarLeft}>
          <Ionicons name="search-outline" size={14} color="#666" />
          <Text style={styles.toolbarText}> Pinch or use buttons to zoom</Text>
        </View>
        <View style={styles.toolbarRight}>
          <TouchableOpacity style={styles.zoomBtn} onPress={handleZoomOut}>
            <Ionicons name="remove" size={20} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.zoomBtn} onPress={handleZoomIn}>
            <Ionicons name="add" size={20} color="#000" />
          </TouchableOpacity>
        </View>
      </View> */}

      {/* Code Area */}
      <View style={styles.codeContainer}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" />
          </View>
        ) : ext === 'md' ? (
          <ScrollView
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.readmeContainer}
          >
            <Markdown
              style={markdownStyles}
              rules={{
                image: (node: any, children: any, parent: any, styles: any) => {
                  const { key, ...rest } = node.attributes;
                  return (
                    <Image
                      key={node.key}
                      style={markdownStyles.image}
                      source={{ uri: rest.src }}
                      accessibilityLabel={rest.alt || ''}
                      resizeMode="contain"
                    />
                  );
                },
              }}
            >
              {preprocessMarkdown(code)}
            </Markdown>
          </ScrollView>
        ) : (
          <GestureDetector gesture={pinchGesture}>
            <Animated.View style={[styles.gestureWrapper]}>
              <ScrollView
                showsVerticalScrollIndicator={true}
                contentContainerStyle={styles.scrollContent}
              >
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={true}
                  contentContainerStyle={styles.scrollContentHorizontal}
                >
                  <Animated.View
                    style={[styles.codeScaleWrapper, animatedStyle]}
                  >
                    <View style={styles.codeBlock}>
                      {lines.map((line, index) => (
                        <CodeLine
                          key={index}
                          lineNumber={index + 1}
                          lineText={line}
                          fontSize={baseFontSize}
                          totalLines={lines.length}
                        />
                      ))}
                    </View>
                  </Animated.View>
                </ScrollView>
              </ScrollView>
            </Animated.View>
          </GestureDetector>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleContainer: {
    marginLeft: 12,
    flex: 1,
  },
  filename: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#fce7f3',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#be185d',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  iconBtnSmall: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolbarText: {
    fontSize: 12,
    color: '#64748b',
  },
  toolbarRight: {
    flexDirection: 'row',
    gap: 8,
  },
  zoomBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  codeContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gestureWrapper: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  scrollContentHorizontal: {
    flexGrow: 1,
  },
  codeScaleWrapper: {
    transformOrigin: 'top left',
  },
  codeBlock: {
    padding: 8,
    backgroundColor: '#fff',
    minWidth: '100%',
  },
  codeLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  lineNumberGutter: {
    paddingRight: 16,
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
    marginRight: 16,
    alignItems: 'flex-end',
    backgroundColor: '#f8fafc',
  },
  lineNumber: {
    color: '#94a3b8',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  lineContent: {
    flex: 1,
    color: '#334155',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  readmeContainer: {
    padding: 16,
    backgroundColor: '#fff',
  },
});
