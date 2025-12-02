import 'package:flutter/material.dart';
import 'config.dart';
import 'ai_service.dart';

class AIChatPage extends StatefulWidget {
  final String lang;
  const AIChatPage({super.key, required this.lang});

  @override
  State<AIChatPage> createState() => _AIChatPageState();
}

class _AIChatPageState extends State<AIChatPage> {
  final _controller = TextEditingController();
  late List<Map<String, dynamic>> _messages;
  bool _isTyping = false;
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    var t = translations[widget.lang] ?? translations['en']!;
    _messages = [{'text': t['aiWelcome'], 'isMe': false}];
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _sendMessage() async {
    if (_controller.text.trim().isEmpty) return;
    String text = _controller.text;
    setState(() { _messages.add({'text': text, 'isMe': true}); _isTyping = true; });
    _controller.clear();
    _scrollToBottom();

    String response = await fetchAIResponse(text, _messages);
    
    if (mounted) {
      setState(() { _messages.add({'text': response, 'isMe': false}); _isTyping = false; });
      _scrollToBottom();
    }
  }

  @override
  Widget build(BuildContext context) {
    var t = translations[widget.lang] ?? translations['en']!;
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            const Icon(Icons.auto_awesome, size: 20, color: AppColors.primary),
            const SizedBox(width: 10),
            Text(t['aiTitle']!, style: const TextStyle(fontWeight: FontWeight.bold)),
          ],
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                bool isMe = _messages[index]['isMe'];
                return Align(
                  alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(16),
                    constraints: const BoxConstraints(maxWidth: 280),
                    decoration: BoxDecoration(
                      color: isMe ? AppColors.primary : Colors.white,
                      borderRadius: BorderRadius.only(
                        topLeft: const Radius.circular(20),
                        topRight: const Radius.circular(20),
                        bottomLeft: isMe ? const Radius.circular(20) : Radius.zero,
                        bottomRight: isMe ? Radius.zero : const Radius.circular(20),
                      ),
                      boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 5, offset: const Offset(0, 2))]
                    ),
                    child: Text(
                      _messages[index]['text'], 
                      style: TextStyle(color: isMe ? Colors.white : Colors.black87, height: 1.4)
                    ),
                  ),
                );
              },
            ),
          ),
          if (_isTyping) 
            Padding(
              padding: const EdgeInsets.only(left: 20, bottom: 10), 
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text("MindConnect is typing...", style: TextStyle(color: Colors.grey.shade500, fontStyle: FontStyle.italic))
              )
            ),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border(top: BorderSide(color: Colors.grey.shade200)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    decoration: InputDecoration(
                      hintText: "Type a message...",
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(30), borderSide: BorderSide.none),
                      filled: true,
                      fillColor: Colors.grey.shade100,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                CircleAvatar(
                  backgroundColor: AppColors.primary,
                  radius: 24,
                  child: IconButton(
                    icon: const Icon(Icons.send, color: Colors.white, size: 20),
                    onPressed: _sendMessage,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}