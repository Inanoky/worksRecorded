import { Body, Head, Html, Img, Preview } from "@react-email/components";

type InvitationEmailProps = {
	invitationUrl: string;
};

export function InvitationEmail({ invitationUrl }: InvitationEmailProps) {
	return (
		<Html lang="en">
			<Head>
				<meta content="text/html; charset=UTF-8" httpEquiv="Content-Type" />
				<meta content="width=device-width, initial-scale=1.0" name="viewport" />
			</Head>
			<Preview>You have been invited to join WorksRecorded.</Preview>
			<Body
				style={{
					backgroundColor: "#f4f8f4",
					color: "#0b1324",
					fontFamily: "Arial, Helvetica, sans-serif",
					margin: 0,
					padding: 0,
				}}
			>
				<table
					cellPadding="0"
					cellSpacing="0"
					role="presentation"
					style={{ backgroundColor: "#f4f8f4", width: "100%" }}
				>
					<tbody>
						<tr>
							<td align="center" style={{ padding: "32px 16px" }}>
								<table
									cellPadding="0"
									cellSpacing="0"
									role="presentation"
									style={{
										backgroundColor: "#ffffff",
										border: "1px solid #dbe7df",
										borderRadius: "12px",
										maxWidth: "600px",
										overflow: "hidden",
										width: "100%",
									}}
									width="600"
								>
									<tbody>
										<tr>
											<td style={{ padding: "28px 32px 22px" }}>
												<table
													cellPadding="0"
													cellSpacing="0"
													role="presentation"
													style={{ width: "100%" }}
												>
													<tbody>
														<tr>
															<td
																style={{ verticalAlign: "middle" }}
																width="58"
															>
																<Img
																	alt="WorksRecorded"
																	height="48"
																	src="https://www.worksrecorded.com/favicon/favicon-512x512.png"
																	style={{
																		border: 0,
																		display: "block",
																		height: "48px",
																		width: "48px",
																	}}
																	width="48"
																/>
															</td>
															<td
																style={{
																	color: "#0b1324",
																	fontSize: "20px",
																	fontWeight: 700,
																	letterSpacing: "-0.4px",
																	verticalAlign: "middle",
																}}
															>
																Works
																<span style={{ color: "#087a49" }}>
																	Recorded
																</span>
															</td>
														</tr>
													</tbody>
												</table>
											</td>
										</tr>
										<tr>
											<td
												style={{
													backgroundColor: "#087a49",
													fontSize: 0,
													height: "4px",
													lineHeight: 0,
												}}
											>
												&nbsp;
											</td>
										</tr>
										<tr>
											<td style={{ padding: "38px 32px 34px" }}>
												<p
													style={{
														color: "#087a49",
														fontSize: "12px",
														fontWeight: 700,
														letterSpacing: "1.4px",
														margin: "0 0 12px",
														textTransform: "uppercase",
													}}
												>
													Team invitation
												</p>
												<h1
													style={{
														color: "#0b1324",
														fontSize: "28px",
														lineHeight: "36px",
														margin: "0 0 16px",
													}}
												>
													You’re invited to WorksRecorded
												</h1>
												<p
													style={{
														color: "#52615a",
														fontSize: "16px",
														lineHeight: "25px",
														margin: "0 0 28px",
													}}
												>
													A WorksRecorded administrator invited you to join
													their organization. Create your account to get
													started.
												</p>
												<table
													cellPadding="0"
													cellSpacing="0"
													role="presentation"
												>
													<tbody>
														<tr>
															<td
																align="center"
																style={{
																	backgroundColor: "#087a49",
																	borderRadius: "8px",
																}}
															>
																<a
																	href={invitationUrl}
																	style={{
																		color: "#ffffff",
																		display: "inline-block",
																		fontSize: "16px",
																		fontWeight: 700,
																		padding: "14px 24px",
																		textDecoration: "none",
																	}}
																>
																	Create your account
																</a>
															</td>
														</tr>
													</tbody>
												</table>
												<p
													style={{
														color: "#6b7670",
														fontSize: "13px",
														lineHeight: "20px",
														margin: "28px 0 8px",
													}}
												>
													If the button does not work, copy and paste this link
													into your browser:
												</p>
												<p
													style={{
														fontSize: "13px",
														lineHeight: "20px",
														margin: 0,
														overflowWrap: "anywhere",
													}}
												>
													<a href={invitationUrl} style={{ color: "#087a49" }}>
														{invitationUrl}
													</a>
												</p>
											</td>
										</tr>
										<tr>
											<td
												style={{
													borderTop: "1px solid #e6ece8",
													color: "#77827c",
													fontSize: "12px",
													lineHeight: "18px",
													padding: "20px 32px 24px",
												}}
											>
												If you were not expecting this invitation, you can
												safely ignore this email.
											</td>
										</tr>
									</tbody>
								</table>
							</td>
						</tr>
					</tbody>
				</table>
			</Body>
		</Html>
	);
}
