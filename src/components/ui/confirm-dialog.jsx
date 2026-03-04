import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Reusable confirmation dialog built on shadcn/ui AlertDialog.
 *
 * @param {Object}  props
 * @param {boolean} props.open           Controlled open state
 * @param {(v:boolean)=>void} props.onOpenChange  Toggle handler
 * @param {string}  props.title          Dialog heading
 * @param {string}  props.description    Body text
 * @param {()=>void} props.onConfirm     Called when user confirms
 * @param {()=>void} [props.onCancel]    Called when user cancels (defaults to close)
 * @param {string}  [props.confirmText]  Confirm button label (default: "Excluir")
 * @param {string}  [props.cancelText]   Cancel button label (default: "Cancelar")
 */
export default function ConfirmDialog({
  open,
  onOpenChange,
  title = "Confirmar exclusão",
  description = "Esta ação não pode ser desfeita.",
  onConfirm,
  onCancel,
  confirmText = "Excluir",
  cancelText = "Cancelar",
}) {
  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const handleConfirm = () => {
    onConfirm?.();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-600"
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
