import React, { useState } from "react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, KeyRound, ShieldCheck } from "lucide-react";
import { configurarMni, enviarOtp } from "@/services/scraperService";

/**
 * Modal de configuração de credenciais PJe (MNI + 2FA).
 *
 * Estado 1 — CPF + Senha
 * Estado 2 — Código OTP do celular
 */
export default function PjeConfigModal({ open, onOpenChange }) {
    // Formulário
    const [cpf, setCpf] = useState("");
    const [senha, setSenha] = useState("");
    const [otp, setOtp] = useState("");

    // Fluxo
    const [step, setStep] = useState(1); // 1 = credenciais, 2 = OTP
    const [sessionId, setSessionId] = useState(null);
    const [loading, setLoading] = useState(false);

    // ── Enviar credenciais ────────────────────────────────────
    const handleSubmitCredentials = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = await configurarMni(cpf, senha);
            setSessionId(data.sessionId);
            setStep(2);
            toast.info("Credenciais salvas. Insira o código 2FA enviado ao celular.");
        } catch (err) {
            toast.error(err.message || "Erro ao configurar credenciais.");
        } finally {
            setLoading(false);
        }
    };

    // ── Enviar OTP ────────────────────────────────────────────
    const handleSubmitOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await enviarOtp(sessionId, otp);
            toast.success("Login PJe concluído com sucesso!");
            resetAndClose();
        } catch (err) {
            toast.error(err.message || "Erro ao enviar código OTP.");
        } finally {
            setLoading(false);
        }
    };

    // ── Reset ─────────────────────────────────────────────────
    const resetAndClose = () => {
        setCpf("");
        setSenha("");
        setOtp("");
        setStep(1);
        setSessionId(null);
        setLoading(false);
        onOpenChange(false);
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(v) => {
                if (!v) resetAndClose();
                else onOpenChange(v);
            }}
        >
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {step === 1 ? (
                            <>
                                <KeyRound className="w-5 h-5 text-[#1e3a5f]" />
                                Configurar PJe
                            </>
                        ) : (
                            <>
                                <ShieldCheck className="w-5 h-5 text-green-600" />
                                Verificação 2FA
                            </>
                        )}
                    </DialogTitle>
                    <DialogDescription>
                        {step === 1
                            ? "Informe as credenciais do PJe para habilitar a sincronização."
                            : "Digite o código enviado para o celular vinculado ao PJe."}
                    </DialogDescription>
                </DialogHeader>

                {/* ── Estado 1: Credenciais ──────────────────────────── */}
                {step === 1 && (
                    <form onSubmit={handleSubmitCredentials} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="pje-cpf">CPF</Label>
                            <Input
                                id="pje-cpf"
                                placeholder="000.000.000-00"
                                value={cpf}
                                onChange={(e) => setCpf(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="pje-senha">Senha</Label>
                            <Input
                                id="pje-senha"
                                type="password"
                                placeholder="••••••••"
                                value={senha}
                                onChange={(e) => setSenha(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={resetAndClose}
                                disabled={loading}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                className="bg-[#1e3a5f] hover:bg-[#2d5a87]"
                                disabled={loading}
                            >
                                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Enviar
                            </Button>
                        </DialogFooter>
                    </form>
                )}

                {/* ── Estado 2: OTP ──────────────────────────────────── */}
                {step === 2 && (
                    <form onSubmit={handleSubmitOtp} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="pje-otp">Código do Celular (OTP)</Label>
                            <Input
                                id="pje-otp"
                                placeholder="123456"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                required
                                disabled={loading}
                                autoFocus
                                maxLength={8}
                            />
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={resetAndClose}
                                disabled={loading}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                className="bg-green-600 hover:bg-green-700"
                                disabled={loading}
                            >
                                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Verificar
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
