import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  File,
  FileText,
  FileCode,
  FileJson,
  Search,
  Download,
  Eye,
  ArrowLeft,
  Home,
  HardDrive,
} from 'lucide-react';
import { MOCK_FILES, type IFileNode } from '@/data/files';
import { toast } from 'sonner';

function getFileIcon(name: string) {
  if (name.endsWith('.json')) return <FileJson className="size-4 text-warning" />;
  if (name.endsWith('.sh')) return <FileCode className="size-4 text-success" />;
  if (name.endsWith('.conf')) return <FileCode className="size-4 text-primary" />;
  if (name.endsWith('.log')) return <FileText className="size-4 text-muted-foreground" />;
  if (name.endsWith('.gz') || name.endsWith('.tar.gz')) return <File className="size-4 text-destructive" />;
  return <File className="size-4 text-muted-foreground" />;
}

function getFilePreview(name: string): string {
  if (name.endsWith('.json')) return '{\n  "sensor_id": "TEMP-001",\n  "value": 25.6,\n  "unit": "°C",\n  "timestamp": "2025-01-15T09:18:00Z",\n  "quality": "good"\n}';
  if (name.endsWith('.log')) return '[2025-01-15 10:25:01] INFO  System startup complete.\n[2025-01-15 10:25:05] INFO  Modbus service started on port 502.\n[2025-01-15 10:25:10] INFO  MQTT broker listening on port 1883.\n[2025-01-15 10:30:22] WARN  Disk usage exceeds 80% threshold.';
  if (name.endsWith('.conf')) return '# Network Configuration\ninterface eth0\n  ip_address 192.168.1.1\n  netmask 255.255.255.0\n  gateway 192.168.1.254\n  dns 8.8.8.8';
  if (name.endsWith('.sh')) return '#!/bin/bash\n# EdgeGateway Startup Script\necho "Starting EdgeGateway services..."\nsystemctl start modbus-tcp\nsystemctl start mqtt-broker\necho "All services started."';
  return 'Binary file - preview not available';
}

export default function FileManagerPage() {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['1']));
  const [currentPath, setCurrentPath] = useState<string[]>(['root']);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewFile, setPreviewFile] = useState<IFileNode | null>(null);

  const rootChildren = MOCK_FILES[0]?.children || [];

  function findNodeById(id: string, nodes: IFileNode[]): IFileNode | null {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNodeById(id, node.children);
        if (found) return found;
      }
    }
    return null;
  }

  function findNodeByPath(path: string[], nodes: IFileNode[]): IFileNode | null {
    if (path.length === 0) return null;
    let current: IFileNode | null = null;
    for (const node of nodes) {
      if (node.name === path[0]) {
        current = node;
        break;
      }
    }
    if (!current) return null;
    if (path.length === 1) return current;
    return findNodeByPath(path.slice(1), current.children || []);
  }

  const currentDir = findNodeByPath(currentPath, rootChildren);
  const children = currentDir?.children || [];

  const filteredChildren = useMemo(() => {
    if (!searchQuery.trim()) return children;
    return children.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [children, searchQuery]);

  const toggleDir = (id: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const navigateTo = (node: IFileNode) => {
    if (node.type === 'directory') {
      setCurrentPath((prev) => [...prev, node.name]);
      setExpandedDirs((prev) => new Set([...prev, node.id]));
      setSearchQuery('');
    }
  };

  const goBack = () => {
    if (currentPath.length > 1) {
      setCurrentPath((prev) => prev.slice(0, -1));
      setSearchQuery('');
    }
  };

  const goToPath = (index: number) => {
    setCurrentPath((prev) => prev.slice(0, index + 1));
    setSearchQuery('');
  };

  const handleDownload = (node: IFileNode) => {
    const content = getFilePreview(node.name);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = node.name;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`已下载: ${node.name}`);
  };

  const handlePreview = (node: IFileNode) => {
    setPreviewFile(node);
  };

  function renderTree(nodes: IFileNode[], depth: number = 0): React.ReactNode {
    return nodes.map((node) => (
      <div key={node.id}>
        <button
          onClick={() => {
            if (node.type === 'directory') {
              toggleDir(node.id);
              navigateTo(node);
            }
          }}
          className={`w-full flex items-center gap-1.5 px-2 py-1.5 text-sm rounded-md hover:bg-accent/50 transition-colors text-left ${
            currentPath.includes(node.name) ? 'bg-accent/30 text-accent-foreground' : 'text-muted-foreground'
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {node.type === 'directory' ? (
            expandedDirs.has(node.id) ? (
              <FolderOpen className="size-4 text-primary shrink-0" />
            ) : (
              <Folder className="size-4 text-primary shrink-0" />
            )
          ) : (
            getFileIcon(node.name)
          )}
          <span className="truncate">{node.name}</span>
          {node.type === 'directory' && (
            <ChevronRight
              className={`size-3 ml-auto shrink-0 transition-transform ${expandedDirs.has(node.id) ? 'rotate-90' : ''}`}
            />
          )}
        </button>
        {node.type === 'directory' && expandedDirs.has(node.id) && node.children && (
          <div>{renderTree(node.children, depth + 1)}</div>
        )}
      </div>
    ));
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Tree Panel */}
        <Card className="border-border/40 bg-card/60 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <HardDrive className="size-4 text-primary" />
              文件系统
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 max-h-[calc(100vh-280px)] overflow-y-auto">
            {renderTree(rootChildren)}
          </CardContent>
        </Card>

        {/* File List */}
        <Card className="border-border/40 bg-card/60 lg:col-span-3">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  onClick={goBack}
                  disabled={currentPath.length <= 1}
                >
                  <ArrowLeft className="size-4" />
                </Button>
                <div className="flex items-center gap-1 text-sm min-w-0">
                  <button onClick={() => goToPath(0)} className="flex items-center gap-1 text-primary hover:underline shrink-0">
                    <Home className="size-3.5" />
                  </button>
                  {currentPath.map((seg, i) => (
                    <span key={i} className="flex items-center gap-1 min-w-0">
                      <ChevronRight className="size-3 text-muted-foreground shrink-0" />
                      <button
                        onClick={() => goToPath(i)}
                        className={`truncate hover:underline ${i === currentPath.length - 1 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
                      >
                        {seg}
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索文件..."
                  className="bg-background pl-9 h-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap w-[40%]">名称</TableHead>
                    <TableHead className="whitespace-nowrap">类型</TableHead>
                    <TableHead className="whitespace-nowrap">大小</TableHead>
                    <TableHead className="whitespace-nowrap">修改时间</TableHead>
                    <TableHead className="whitespace-nowrap text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredChildren.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        {searchQuery ? '未找到匹配的文件' : '空目录'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredChildren.map((node, i) => (
                      <motion.tr
                        key={node.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.03 }}
                        className="border-b border-border/30"
                      >
                        <TableCell>
                          <button
                            onClick={() => node.type === 'directory' ? navigateTo(node) : undefined}
                            className={`flex items-center gap-2 text-sm hover:text-primary transition-colors ${node.type === 'directory' ? 'cursor-pointer' : ''}`}
                          >
                            {node.type === 'directory' ? (
                              <Folder className="size-4 text-primary shrink-0" />
                            ) : (
                              getFileIcon(node.name)
                            )}
                            <span className="truncate max-w-[200px]">{node.name}</span>
                          </button>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant="outline" className="text-xs">
                            {node.type === 'directory' ? '目录' : '文件'}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {node.size || '-'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {node.modifiedTime}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {node.type === 'file' && (
                              <>
                                <Button variant="ghost" size="icon" className="size-8" onClick={() => handlePreview(node)}>
                                  <Eye className="size-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="size-8" onClick={() => handleDownload(node)}>
                                  <Download className="size-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] border-border/40 bg-card/95">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              {previewFile && getFileIcon(previewFile.name)}
              {previewFile?.name}
            </DialogTitle>
          </DialogHeader>
          <pre className="p-4 rounded-lg bg-muted/40 text-sm font-mono text-muted-foreground overflow-auto max-h-[60vh] whitespace-pre-wrap">
            {previewFile ? getFilePreview(previewFile.name) : ''}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}
