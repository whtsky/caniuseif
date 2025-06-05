import { ExternalLink } from 'lucide-react'
import { Button } from './ui/button'
import { cn } from '@/lib/utils'

interface CanIUseLearnMoreButtonProps {
  featureTitle: string
  featureId: string
  className?: string
}

export function CanIUseLearnMoreButton({ featureTitle, featureId, className }: CanIUseLearnMoreButtonProps) {
  const href = `https://caniuse.com/?search=${featureId}`

  return (
    <Button 
      variant="outline" 
      className={cn(
        "justify-start text-left h-auto min-h-[2.5rem] py-2 px-3",
        className
      )} 
      asChild={true}
    >
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-start gap-2 w-full"
      >
        <div className="flex-1 min-w-0">
          <span className="block text-sm font-medium leading-tight">
            Check on caniuse.com
          </span>
          <span className="block text-xs text-muted-foreground truncate mt-0.5">
            {featureTitle}
          </span>
        </div>
        <ExternalLink className="h-4 w-4 shrink-0 mt-0.5" />
      </a>
    </Button>
  )
}
