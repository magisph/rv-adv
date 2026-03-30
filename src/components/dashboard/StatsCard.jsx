import React from "react";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  trendUp,
  color = "blue",
}) {
  const colorVariants = {
    blue: "from-blue-500 to-blue-600",
    green: "from-emerald-500 to-emerald-600",
    purple: "from-violet-500 to-violet-600",
    orange: "from-orange-500 to-orange-600",
    red: "from-red-500 to-red-600",
    gold: "from-amber-500 to-amber-600",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="relative overflow-hidden bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-600 uppercase tracking-wide">
                {title}
              </p>
              <p className="text-3xl font-bold text-slate-800">{value}</p>
              {trend && (
                <p
                  className={`text-sm font-medium ${trendUp ? "text-emerald-600" : "text-red-600"}`}
                >
                  {trendUp ? "↑" : "↓"} {trend}
                </p>
              )}
            </div>
            <div
              className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colorVariants[color]} flex items-center justify-center shadow-lg`}
            >
              <Icon className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>
        <div className={`h-1 bg-gradient-to-r ${colorVariants[color]}`} />
      </Card>
    </motion.div>
  );
}
