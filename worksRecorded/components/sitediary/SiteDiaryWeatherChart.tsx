"use client";

import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

export type SiteDiaryWeatherChartHour = {
	hour: number;
	temperatureC: number | null;
	windSpeedMs: number | null;
};

export default function SiteDiaryWeatherChart({
	hours,
	temperatureLabel,
	windLabel,
}: {
	hours: SiteDiaryWeatherChartHour[];
	temperatureLabel: string;
	windLabel: string;
}) {
	return (
		<ResponsiveContainer width="100%" height="100%">
			<LineChart
				data={hours.map((hour) => ({
					hourLabel: `${String(hour.hour).padStart(2, "0")}:00`,
					temperatureC: hour.temperatureC,
					windSpeedMs: hour.windSpeedMs,
				}))}
				margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
			>
				<CartesianGrid strokeDasharray="3 3" />
				<XAxis dataKey="hourLabel" tick={{ fontSize: 11 }} interval={2} />
				<YAxis yAxisId="temp" tick={{ fontSize: 11 }} width={35} />
				<YAxis
					yAxisId="wind"
					orientation="right"
					tick={{ fontSize: 11 }}
					width={35}
				/>
				<Tooltip />
				<Line
					yAxisId="temp"
					type="monotone"
					dataKey="temperatureC"
					name={temperatureLabel}
					stroke="#ef4444"
					strokeWidth={2}
					dot={false}
					connectNulls
				/>
				<Line
					yAxisId="wind"
					type="monotone"
					dataKey="windSpeedMs"
					name={windLabel}
					stroke="#3b82f6"
					strokeWidth={2}
					dot={false}
					connectNulls
				/>
			</LineChart>
		</ResponsiveContainer>
	);
}
