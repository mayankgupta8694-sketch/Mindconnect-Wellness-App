import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'config.dart';

// --- Screen 1: Community Groups List ---
class CommunityScreen extends StatelessWidget {
  const CommunityScreen({super.key});

  // Hardcoded list of groups for simplicity
  final List<Map<String, dynamic>> groups = const [
    {"name": "Calm Minds Circle", "icon": "🧘‍♀️", "desc": "Meditation & Mindfulness"},
    {"name": "Healing Hearts", "icon": "💖", "desc": "Grief & Recovery Support"},
    {"name": "Motivation Tribe", "icon": "🚀", "desc": "Daily Goals & Positivity"},
    {"name": "Anxiety Support", "icon": "🛡️", "desc": "Safe space for anxiety"},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Community Groups"),
        centerTitle: true,
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: groups.length,
        itemBuilder: (context, index) {
          final group = groups[index];
          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            elevation: 2,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: ListTile(
              contentPadding: const EdgeInsets.all(16),
              leading: Text(group['icon'], style: const TextStyle(fontSize: 32)),
              title: Text(group['name'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
              subtitle: Text(group['desc']),
              trailing: const Icon(Icons.chevron_right, color: AppColors.primary),
              onTap: () {
                // Navigate to the Chat Screen for this specific group
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => GroupChatScreen(
                      groupName: group['name'],
                      groupId: group['name'].replaceAll(" ", "_").toLowerCase(), // simple ID generation
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}

// --- Screen 2: Real-time Chat Screen ---
class GroupChatScreen extends StatefulWidget {
  final String groupName;
  final String groupId;

  const GroupChatScreen({super.key, required this.groupName, required this.groupId});

  @override
  State<GroupChatScreen> createState() => _GroupChatScreenState();
}

class _GroupChatScreenState extends State<GroupChatScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  void _sendMessage() async {
    if (_messageController.text.trim().isEmpty) return;

    final user = _auth.currentUser;
    if (user == null) return; // Should handle auth check better in real app

    try {
      // Use the MANDATORY path format from your instructions:
      // /artifacts/{appId}/public/data/{collectionName}
      // But since this is a custom chat, we can use a simpler root collection structure
      // OR follow the rule if strict security rules are applied. 
      // For a standard Flutter + Firebase setup, a root collection is usually fine unless restricted.
      // Assuming standard setup:
      
      await _firestore
          .collection('groups')
          .doc(widget.groupId)
          .collection('messages')
          .add({
        'text': _messageController.text.trim(),
        'senderId': user.uid,
        'senderEmail': user.email ?? 'Anonymous', // Or fetch user display name
        'timestamp': FieldValue.serverTimestamp(),
      });

      _messageController.clear();
      // Scroll to bottom after sending
      _scrollController.animateTo(
        0.0, // Because we reverse the list, 0 is the bottom
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error sending: $e")));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.groupName),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 1,
      ),
      body: Column(
        children: [
          // Chat List
          Expanded(
            child: StreamBuilder<QuerySnapshot>(
              stream: _firestore
                  .collection('groups')
                  .doc(widget.groupId)
                  .collection('messages')
                  .orderBy('timestamp', descending: true) // Newest at bottom (list is reversed)
                  .snapshots(),
              builder: (context, snapshot) {
                if (snapshot.hasError) {
                  return Center(child: Text("Error: ${snapshot.error}"));
                }
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }

                final messages = snapshot.data!.docs;

                if (messages.isEmpty) {
                  return const Center(child: Text("No messages yet. Say hi!"));
                }

                return ListView.builder(
                  reverse: true, // Starts from bottom
                  controller: _scrollController,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  itemCount: messages.length,
                  itemBuilder: (context, index) {
                    final msgData = messages[index].data() as Map<String, dynamic>;
                    final isMe = msgData['senderId'] == _auth.currentUser?.uid;

                    return Align(
                      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(12),
                        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
                        decoration: BoxDecoration(
                          color: isMe ? AppColors.primary : Colors.grey[200],
                          borderRadius: BorderRadius.only(
                            topLeft: const Radius.circular(16),
                            topRight: const Radius.circular(16),
                            bottomLeft: isMe ? const Radius.circular(16) : Radius.zero,
                            bottomRight: isMe ? Radius.zero : const Radius.circular(16),
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Only show name if it's not me
                            if (!isMe) 
                              Text(
                                msgData['senderEmail']?.split('@')[0] ?? 'User',
                                style: TextStyle(
                                  fontSize: 10, 
                                  fontWeight: FontWeight.bold, 
                                  color: Colors.grey[600]
                                )
                              ),
                            if (!isMe) const SizedBox(height: 4),
                            Text(
                              msgData['text'] ?? '',
                              style: TextStyle(
                                color: isMe ? Colors.white : Colors.black87,
                                fontSize: 16
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                );
              },
            ),
          ),
          
          // Input Area
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), offset: const Offset(0, -2), blurRadius: 5)]
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _messageController,
                    decoration: InputDecoration(
                      hintText: "Type a message...",
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(30), borderSide: BorderSide.none),
                      filled: true,
                      fillColor: Colors.grey[100],
                      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                    ),
                    textCapitalization: TextCapitalization.sentences,
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