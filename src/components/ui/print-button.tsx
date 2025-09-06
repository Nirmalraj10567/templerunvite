import * as React from "react"
import { Button, type ButtonProps } from "./button"
import { Printer } from "lucide-react"
import { useTranslation } from "react-i18next"

type PrintButtonProps = ButtonProps & {
  onClick: () => void
}

export function PrintButton({ onClick, ...props }: PrintButtonProps) {
  const { t } = useTranslation()
  
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      title={t('Print Receipt', 'ரசீது அச்சிட')}
      {...props}
    >
      <Printer className="h-4 w-4 text-blue-600 hover:text-blue-800" />
    </Button>
  )
}
