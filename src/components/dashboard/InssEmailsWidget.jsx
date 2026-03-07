import React from "react";
import { useQuery } from "@tanstack/react-query";
import { inssEmailService } from "@/services";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Calendar, MapPin } from "lucide-react";
import { format } from "date-fns";

export default function InssEmailsWidget() {
    const { data: emails = [], isLoading } = useQuery({
        queryKey: ["latest-inss-emails"],
        queryFn: () => inssEmailService.list("-created_at", 10),
        staleTime: 2 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });

    if (isLoading) {
        return (
            <Card className="border-0 shadow-sm mt-8">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Mail className="w-5 h-5 text-[#1e3a5f]" />
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

    return (
        <Card className="border-0 shadow-sm mt-8">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Mail className="w-5 h-5 text-[#1e3a5f]" />
                    Últimos E-mails do INSS
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {emails.map((email) => (
                        <div key={email.id} className="p-4 bg-white border border-slate-100 rounded-lg shadow-sm">
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-2">
                                <div>
                                    <h3 className="font-semibold text-slate-800">{email.subject}</h3>
                                    <p className="text-sm text-slate-500">
                                        Remetente: {email.sender || "N/A"} | Recebido em: {format(new Date(email.created_at), "dd/MM/yyyy HH:mm")}
                                    </p>
                                </div>
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
                            </div>

                            {/* Extração Destacada */}
                            {(email.extracted_date || email.extracted_location) && (
                                <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg flex flex-col sm:flex-row gap-6">
                                    {email.extracted_date && (
                                        <div className="flex items-start gap-3">
                                            <div className="bg-blue-100 p-2.5 rounded-md text-blue-700 mt-1">
                                                <Calendar className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">Data da Perícia</p>
                                                <p className="font-bold text-slate-800 text-lg">{email.extracted_date}</p>
                                            </div>
                                        </div>
                                    )}
                                    {email.extracted_location && (
                                        <div className="flex items-start gap-3">
                                            <div className="bg-blue-100 p-2.5 rounded-md text-blue-700 mt-1">
                                                <MapPin className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">Local da Perícia</p>
                                                <p className="font-bold text-slate-800 text-base leading-snug">{email.extracted_location}</p>
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
