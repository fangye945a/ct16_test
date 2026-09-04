import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { LucideIcon } from 'lucide-react'

export default function ReservedFeaturePage({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <Badge variant="outline" className="text-xs">
          预留实现
        </Badge>
      </div>

      <Card className="border-border/40 bg-card/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className="size-4 text-primary" />
            功能预留
          </CardTitle>
          <CardDescription>
            当前页面已纳入 CT16 正式信息架构，后续由 CT16 Common Backend 和运行时服务接入真实能力。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>本阶段不接入真实运行时，也不保留原型里的 mock 交互逻辑。</p>
          <p>后续落地时，这里会替换成真实 API、状态反馈和可操作界面。</p>
        </CardContent>
      </Card>
    </div>
  )
}
