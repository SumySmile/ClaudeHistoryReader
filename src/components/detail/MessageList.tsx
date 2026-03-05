import { Message } from '../../lib/api';
import { MessageBubble } from './MessageBubble';

interface Props {
  messages: Message[];
}

export function MessageList({ messages }: Props) {
  return (
    <div className="space-y-4 py-4">
      {messages.map((msg, i) => (
        <MessageBubble key={msg.uuid || i} message={msg} />
      ))}
    </div>
  );
}
