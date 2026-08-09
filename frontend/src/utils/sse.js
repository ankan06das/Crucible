export function parseSSEChunk(frame) {
  let event = "message";
  const dataLines = [];
  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }
  const dataStr = dataLines.join("\n");
  if (!dataStr) return null;
  let data;
  try {
    data = JSON.parse(dataStr);
  } catch {
    return null;
  }
  return { event, data };
}
