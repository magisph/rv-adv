import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Calendar, MapPin, Archive } from "lucide-react";
import { format } from "date-fns";
import { createPageUrl } from "@/utils";

export default function InssEmailsWidget() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: emails = [], isLoading } = useQuery({
        queryKey: ["latest-inss-emails"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("client_inss_emails")
                .select("*, clients(full_name)")
                .eq("is_archived", false)
                .order("created_at", { ascending: false })
                .limit(10);
            if (error) throw error;
            return data;
        },
        staleTime: 2 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });

    if (isLoading) {
        return (
            <Card className="border-0 shadow-sm mt-8">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Mail className="w-5 h-5 text-legal-blue" />
                        Últimos E-mails do INSS
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center py-8">
                    <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
                </CardContent>
            </Card>
        );
    }

    if (emails.length === 0) return null;

    const handleArchive = async (e, id) => {
        e.stopPropagation();
        const { error } = await supabase
            .from("client_inss_emails")
            .update({ is_archived: true })
            .eq("id", id);

        if (!error) {
            queryClient.invalidateQueries(["latest-inss-emails"]);
        }
    };

    return (
        <Card className="border-0 shadow-sm mt-8">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Mail className="w-5 h-5 text-legal-blue" />
                    Últimos E-mails do INSS
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {emails.map((email) => (
                        <div
                            key={email.id}
                            className="p-4 bg-white border border-slate-100 rounded-lg shadow-sm cursor-pointer hover:bg-slate-50 border-transparent hover:border-slate-200 transition-colors"
                            onClick={() => navigate(createPageUrl(`ClientDetail?id=${email.client_id}&tab=emails`))}
                        >
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-2">
                                <div>
                                    <h3 className="font-semibold text-slate-800">{email.subject}</h3>
                                    <p className="text-sm text-slate-600 mb-1">
                                        Cliente: <span className="font-medium text-slate-700">{email.clients?.full_name || "N/A"}</span>
                                    </p>
                                    <p className="text-xs text-slate-600">
                                        Recebido em: {format(new Date(email.created_at), "dd/MM/yyyy HH:mm")}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge
                                        variant="outline"
                                        className={
                                            email.status === 'processado'
                                                ? "bg-green-100 text-green-700 border-green-200 px-3 font-medium"
                                                : "bg-yellow-100 text-yellow-700 border-yellow-200 px-3 font-medium"
                                        }
                                    >
                                        {email.status === 'processado' ? 'Processado pela IA' : 'Pendente'}
                                    </Badge>
                                    <button
                                        onClick={(e) => handleArchive(e, email.id)}
                                        className="p-1.5 text-slate-600 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                                        title="Arquivar Notificação"
                                    >
                                        <Archive className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Extração Destacada */}
                            {(email.extracted_date || email.extracted_location) && (
                                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex flex-col gap-4">
                                    {email.extracted_date && (
                                        <div className="flex items-start gap-3 flex-1">
                                            <div className="bg-blue-100 p-2.5 rounded text-blue-700 mt-1 flex-shrink-0">
                                                <Calendar className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">Data da Perícia</p>
                                                <p className="font-bold text-slate-800 text-lg">{format(new Date(email.extracted_date), "dd-MM-yyyy ' | ' HH:mm")}</p>
                                            </div>
                                        </div>
                                    )}
                                    {email.extracted_location && (
                                        <div className="flex items-start gap-3 flex-1">
                                            <div className="bg-blue-100 p-2.5 rounded text-blue-700 mt-1 flex-shrink-0">
                                                <MapPin className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">Local da Perícia</p>
                                                <p className="font-bold text-slate-800 text-sm leading-snug">{email.extracted_location}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
