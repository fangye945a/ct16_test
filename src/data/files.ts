// EXPORTS: IFileNode, MOCK_FILES

export interface IFileNode {
  id: string
  name: string
  type: 'file' | 'directory'
  size?: string
  modifiedTime: string
  children?: IFileNode[]
}

export const MOCK_FILES: IFileNode[] = [
  {
    id: '1',
    name: 'root',
    type: 'directory',
    modifiedTime: '2024-01-15 10:30',
    children: [
      {
        id: '1-1',
        name: 'data',
        type: 'directory',
        modifiedTime: '2024-01-15 09:20',
        children: [
          {
            id: '1-1-1',
            name: 'sensor_data.json',
            type: 'file',
            size: '2.3 MB',
            modifiedTime: '2024-01-15 09:18'
          },
          {
            id: '1-1-2',
            name: 'config_backup.tar.gz',
            type: 'file',
            size: '15.7 MB',
            modifiedTime: '2024-01-14 22:45'
          }
        ]
      },
      {
        id: '1-2',
        name: 'logs',
        type: 'directory',
        modifiedTime: '2024-01-15 10:25',
        children: [
          {
            id: '1-2-1',
            name: 'system.log',
            type: 'file',
            size: '8.1 MB',
            modifiedTime: '2024-01-15 10:25'
          },
          {
            id: '1-2-2',
            name: 'error.log',
            type: 'file',
            size: '1.2 MB',
            modifiedTime: '2024-01-15 08:30'
          }
        ]
      },
      {
        id: '1-3',
        name: 'config',
        type: 'directory',
        modifiedTime: '2024-01-13 16:00',
        children: [
          {
            id: '1-3-1',
            name: 'network.conf',
            type: 'file',
            size: '2 KB',
            modifiedTime: '2024-01-13 15:55'
          }
        ]
      },
      {
        id: '1-4',
        name: 'scripts',
        type: 'directory',
        modifiedTime: '2024-01-10 11:00',
        children: [
          {
            id: '1-4-1',
            name: 'startup.sh',
            type: 'file',
            size: '4 KB',
            modifiedTime: '2024-01-10 10:58'
          }
        ]
      }
    ]
  }
]