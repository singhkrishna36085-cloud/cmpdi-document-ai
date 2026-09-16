import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  trendUp?: boolean;
}

export function StatCard({ title, value, icon, trend, trendUp }: StatCardProps) {
  return (
    <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6 border border-gray-100">
      <div className="flex items-center">
        <div className="flex-shrink-0 rounded-md bg-blue-50 p-3">
          {icon}
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="truncate text-sm font-medium text-gray-500">
              {title}
            </dt>
            <dd>
              <div className="text-2xl font-semibold text-gray-900">{value}</div>
            </dd>
          </dl>
        </div>
      </div>
      {trend && (
        <div className="mt-4">
          <div className={`text-sm ${trendUp ? "text-green-600" : "text-red-600"}`}>
            {trend}
          </div>
        </div>
      )}
    </div>
  );
}
