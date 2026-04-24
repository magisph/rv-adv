import React, { useState, useEffect } from "react";
import { authService } from "@/services/authService";
import { aiService } from "@/services/aiService";
import { userService, clientService, processService, beneficioService } from "@/services";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, X, Crown, Paperclip, FileText, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".doc", ".jpg", ".jpeg", ".png"];

export default function TaskForm({ task, onSave, onCancel, isSaving }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [arquivos, setArquivos] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [existingAttachments, setExistingAttachments] = useState(task?.attachments || []);

  useEffect(() => {
    const loadUser = async () => {
      const user = await authService.getCurrentUser();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "todo",
    priority: "media",
    due_date: "",
    assigned_to: "",
    assigned_name: "",
    client_id: "",
    client_name: "",
    process_id: "",
    process_number: "",
    ...task,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users-list"],
    queryFn: () => userService.list(),
  });

  const userRole = currentUser?.role?.toLowerCase() || "";
  const isAssistant = userRole === "secretaria" || userRole === "assistente";
  const isCollaborativeMode = users.length > 0;

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list"],
    queryFn: () => clientService.list(),
  });

  const { data: processes = [] } = useQuery({
    queryKey: ["processes-list"],
    queryFn: () => processService.list(),
  });

  const { data: beneficios = [] } = useQuery({
    queryKey: ["beneficios-list"],
    queryFn: () => beneficioService.list(),
  });

  useEffect(() => {
    if (isAssistant && currentUser?.email && !task) {
      setFormData((prev) => ({
        ...prev,
        assigned_to: currentUser.email,
        assigned_name: currentUser.full_name || currentUser.email,
      }));
    }
  }, [isAssistant, currentUser, task]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleUserChange = (userId) => {
    const user = users.find((u) => u.id === userId);
    setFormData((prev) => ({
      ...prev,
      assigned_to: user?.email || "",
      assigned_name: user?.full_name || "",
    }));
  };

  const handleClientChange = (clientId) => {
    const client = clients.find((c) => c.id === clientId);
    setFormData((prev) => ({
      ...prev,
      client_id: clientId,
      client_name: client?.full_name || "",
    }));
  };

  const handleProcessChange = (processId) => {
    const process = processes.find((p) => p.id === processId);
    setFormData((prev) => ({
      ...prev,
      process_id: processId,
      process_number: process?.process_number || "",
    }));
  };

  const validateFile = (file) => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`O arquivo ${file.name} excede o limite de 5MB.`);
      return false;
    }
    const ext = `.${file.name.split(".").pop().toLowerCase()}`;
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      toast.error(`Extensão ${ext} não permitida.`);
      return false;
    }
    return true;
  };

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    const validFiles = selected.filter(validateFile);
    
    if (validFiles.length + arquivos.length + existingAttachments.length > 10) {
      toast.error("Máximo de 10 anexos permitidos por tarefa.");
      return;
    }
    
    setArquivos((prev) => [...prev, ...validFiles]);
    e.target.value = ""; // Reset input
  };

  const removeFile = (index) => {
    setArquivos((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingAttachment = (index) => {
    setExistingAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = { ...formData };
    
    // Cleanup ghost columns from task object if any
    delete payload.beneficio_id;
    delete payload.beneficio_tipo;

    // Null Safety for UUID/Date fields
    const nullableFields = ["client_id", "process_id", "due_date", "assigned_to"];
    nullableFields.forEach((field) => {
      if (payload[field] === "" || payload[field] === "none") payload[field] = null;
    });

    setIsUploading(true);
    try {
      const uploadedUrls = [...existingAttachments];
      
      // Upload new files
      for (const file of arquivos) {
        const result = await aiService.uploadFile({ 
          file, 
          bucket: 'task-attachments', 
          folder: 'tasks' 
        });
        uploadedUrls.push({
          name: file.name,
          url: result.file_url,
          path: result.path,
          size: file.size,
          uploaded_at: new Date().toISOString()
        });
      }
      
      payload.attachments = uploadedUrls;
      onSave(payload);
    } catch (err) {
      toast.error("Falha ao processar anexos. Tente novamente.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Título *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => handleChange("title", e.target.value)}
          required
          placeholder="Digite o título da tarefa"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Descreva a tarefa"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(v) => handleChange("status", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">A Fazer</SelectItem>
              <SelectItem value="in_progress">Em Progresso</SelectItem>
              <SelectItem value="in_review">Em Revisão</SelectItem>
              <SelectItem value="done">Concluída</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">Prioridade</Label>
          <Select
            value={formData.priority}
            onValueChange={(v) => handleChange("priority", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="baixa">Baixa</SelectItem>
              <SelectItem value="media">Média</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="urgente">Urgente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="due_date">Vencimento</Label>
          <Input
            id="due_date"
            type="date"
            value={formData.due_date || ""}
            onChange={(e) => handleChange("due_date", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isCollaborativeMode && (
          <div className="space-y-2">
            <Label htmlFor="assigned_to">Responsável</Label>
            {isAssistant ? (
              <Input
                value={currentUser?.full_name || currentUser?.email || ""}
                disabled
                className="bg-slate-50 cursor-not-allowed"
              />
            ) : (
              <Select
                value={
                  users.find((u) => u.email === formData.assigned_to)?.id || "none"
                }
                onValueChange={handleUserChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não atribuído</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        {user.full_name || user.email}
                        {(user.role === "admin" || user.role === "dono") && (
                          <Crown className="w-3 h-3 text-amber-500" />
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="client_id">Cliente (opcional)</Label>
          <Select 
            value={formData.client_id || "none"} 
            onValueChange={(val) => handleClientChange(val === "none" ? null : val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum cliente</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Attachments Section */}
      <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-slate-700 font-semibold">
            <Paperclip className="w-4 h-4" />
            Anexos
          </Label>
          <span className="text-[10px] text-slate-500 uppercase font-medium">
            PDF, DOCX, Imagens (Max 5MB)
          </span>
        </div>

        {/* Existing Attachments */}
        {existingAttachments.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Arquivos Salvos</p>
            {existingAttachments.map((file, idx) => (
              <div key={`existing-${idx}`} className="flex items-center justify-between bg-white p-2 rounded border border-slate-100 text-xs">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="truncate text-slate-700">{file.name}</span>
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 text-slate-400 hover:text-red-500"
                  onClick={() => removeExistingAttachment(idx)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* New Files Queue */}
        {arquivos.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] text-blue-500 font-bold uppercase">Novos Arquivos</p>
            {arquivos.map((file, idx) => (
              <div key={`new-${idx}`} className="flex items-center justify-between bg-blue-50/50 p-2 rounded border border-blue-100 text-xs">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="truncate text-slate-700">{file.name}</span>
                  <span className="text-[10px] text-slate-400">({(file.size / 1024).toFixed(0)} KB)</span>
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 text-slate-400 hover:text-red-500"
                  onClick={() => removeFile(idx)}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="relative">
          <input
            id="attachments"
            type="file"
            multiple
            accept={ALLOWED_EXTENSIONS.join(",")}
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full border-dashed border-2 hover:border-legal-blue hover:bg-blue-50/30 transition-all h-12"
            onClick={() => document.getElementById("attachments").click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Paperclip className="w-4 h-4 mr-2" />
            )}
            {isUploading ? "Processando..." : "Clique para anexar arquivos"}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSaving || isUploading}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isSaving || isUploading}
          className="bg-legal-blue hover:bg-legal-blue-light min-w-[120px]"
        >
          {isSaving || isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salvar Tarefa
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
