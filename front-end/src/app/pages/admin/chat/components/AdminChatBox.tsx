import { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  TextField, 
  IconButton, 
  CircularProgress,
  Avatar,
  Tooltip
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { MessageBubble } from './MessageBubble';
import { chatService } from '~/services/chat.service';
import { Socket } from 'socket.io-client';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const formatMessageTime = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    return format(date, 'HH:mm', { locale: vi });
  }
  
  return format(date, 'HH:mm dd/MM/yyyy', { locale: vi });
};

interface AdminChatBoxProps {
  conversation: any;
  messages: any[];
  currentUser: any;
  socket: Socket;
  onMessageSent: () => void;
}

export const AdminChatBox = ({ 
  conversation, 
  messages, 
  currentUser,
  socket,
  onMessageSent 
}: AdminChatBoxProps) => {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [localMessages, setLocalMessages] = useState(messages);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync messages khi props thay đổi
  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  // Scroll to bottom khi có tin nhắn mới
  useEffect(() => {
    scrollToBottom();
  }, [localMessages]);

  // Socket listener
  useEffect(() => {
    if (socket && conversation?.id) {
      // Join room
      socket.emit('join_conversation', conversation.id);

      // Listen for new messages
      const handleNewMessage = (newMessage) => {
        console.log('New message received:', newMessage);
        if (newMessage.conversation_id === conversation.id) {
          setLocalMessages(prev => {
            const messageExists = prev.some(msg => msg.id === newMessage.id);
            if (messageExists) return prev;
            
            const newMsg = {
              id: newMessage.id,
              conversation_id: newMessage.conversation_id,
              sender_id: newMessage.sender_id,
              message: newMessage.message,
              username: newMessage.username || newMessage.sender_name,
              created_at: newMessage.created_at,
              is_read: false
            };
            
            return [...prev, newMsg];
          });
          scrollToBottom();
          // Notify parent to refresh conversation list
          onMessageSent();
        }
      };

      socket.on('new_message', handleNewMessage);

      return () => {
        socket.off('new_message', handleNewMessage);
        socket.emit('leave_conversation', conversation.id);
      };
    }
  }, [socket, conversation?.id]);

  // Thêm useEffect để mark messages as read khi conversation thay đổi
  useEffect(() => {
    if (conversation?.id && currentUser?.id) {
      const markMessagesAsRead = async () => {
        try {
          // Gọi API để đánh dấu tin nhắn đã đọc
          await chatService.markMessagesAsRead(conversation.id, currentUser.id);
          
          // Emit socket event để thông báo tin nhắn đã được đọc
          socket.emit('messages_read', {
            conversation_id: conversation.id,
            user_id: currentUser.id
          });
          
          // Cập nhật local messages
          setLocalMessages(prev => 
            prev.map(msg => ({
              ...msg,
              is_read: true
            }))
          );
          
          // Notify parent để cập nhật lại conversation list
          onMessageSent();
        } catch (error) {
          console.error('Error marking messages as read:', error);
        }
      };

      markMessagesAsRead();
    }
  }, [conversation?.id, currentUser?.id]);

  // Thêm socket listener cho messages_read event
  useEffect(() => {
    if (socket && conversation?.id) {
      socket.on('messages_read', ({ conversation_id }) => {
        if (conversation_id === conversation.id) {
          setLocalMessages(prev => 
            prev.map(msg => ({
              ...msg,
              is_read: true
            }))
          );
        }
      });

      return () => {
        socket.off('messages_read');
      };
    }
  }, [socket, conversation?.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!message.trim() || !conversation?.id) return;

    const messageText = message.trim();
    setMessage('');
    setLoading(true);

    try {
      const messageData = {
        conversation_id: conversation.id,
        sender_id: currentUser.id,
        message: messageText,
        username: currentUser.username
      };

      const response = await chatService.sendMessage(messageData);
      
      if (response.isSuccess) {
        const newMessage = {
          id: response.data.id,
          ...messageData,
          created_at: new Date().toISOString(),
          is_read: false
        };
        
        socket.emit('send_message', newMessage);
        setLocalMessages(prev => [...prev, newMessage]);
        onMessageSent();
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessage(messageText);
    } finally {
      setLoading(false);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box sx={{ 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      bgcolor: '#f5f5f5'
    }}>
      <Box 
        ref={chatContainerRef}
        sx={{ 
          flex: 1,
          overflow: 'auto',
          p: 1.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5
        }}
      >
        {localMessages.map((msg, index) => (
          <Box
            key={msg.id}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.sender_id === currentUser.id ? 'flex-end' : 'flex-start',
              gap: 0.5
            }}
          >
            {index === 0 || new Date(msg.created_at).getTime() - new Date(localMessages[index - 1].created_at).getTime() > 300000 ? (
              <Typography variant="caption" color="text.secondary" sx={{ px: 2 }}>
                {formatMessageTime(msg.created_at)}
              </Typography>
            ) : null}
            
            <Box sx={{ 
              display: 'flex',
              alignItems: 'flex-end',
              gap: 0.5,
              maxWidth: '60%'
            }}>
              {msg.sender_id !== currentUser.id && (
                <Avatar 
                  sx={{ width: 28, height: 28 }}
                  alt={msg.username}
                >
                  {msg.username?.[0]?.toUpperCase()}
                </Avatar>
              )}
              
              <Paper
                elevation={0}
                sx={{
                  p: 1,
                  borderRadius: 1.5,
                  bgcolor: msg.sender_id === currentUser.id ? '#0084ff' : '#ffffff',
                  color: msg.sender_id === currentUser.id ? '#ffffff' : 'inherit',
                  maxWidth: '100%',
                  wordBreak: 'break-word',
                  fontSize: '0.9rem'
                }}
              >
                <Typography sx={{ fontSize: 'inherit' }}>{msg.message}</Typography>
              </Paper>
            </Box>
          </Box>
        ))}
        <div ref={messagesEndRef} />
      </Box>

      <Box 
        sx={{ 
          p: 1.5,
          bgcolor: 'background.paper',
          borderTop: 1,
          borderColor: 'divider'
        }}
      >
        <TextField
          inputRef={inputRef}
          size="small"
          fullWidth
          multiline
          maxRows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          placeholder="Nhập tin nhắn..."
          autoFocus
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              bgcolor: '#f5f5f5',
              fontSize: '0.9rem'
            }
          }}
          InputProps={{
            endAdornment: (
              <IconButton 
                onClick={handleSend}
                disabled={!message.trim() || loading}
                color="primary"
              >
                {loading ? (
                  <CircularProgress size={24} />
                ) : (
                  <SendIcon />
                )}
              </IconButton>
            ),
          }}
        />
      </Box>
    </Box>
  );
}; 