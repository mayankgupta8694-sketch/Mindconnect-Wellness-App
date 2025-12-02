import 'package:flutter/material.dart';
import 'config.dart';

class HomeScreen extends StatelessWidget {
  final String lang;
  final Function() onStartMood;
  final Function() onStartWellness;
  // --- ADDED THIS LINE ---
  final VoidCallback onMenuTap; 

  const HomeScreen({
    super.key, 
    required this.lang, 
    required this.onStartMood, 
    required this.onStartWellness,
    // --- ADDED THIS LINE ---
    required this.onMenuTap,
  });

  @override
  Widget build(BuildContext context) {
    var t = translations[lang] ?? translations['en']!;
    var hour = DateTime.now().hour;
    String greeting = hour < 12 ? t['greetingMorning']! 
                    : hour < 18 ? t['greetingAfternoon']! 
                    : t['greetingEvening']!;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        children: [
          // Header Row with Menu Button
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              IconButton(
                icon: const Icon(Icons.menu, size: 28, color: Colors.black87),
                // --- THIS CONNECTS THE BUTTON ---
                onPressed: onMenuTap, 
              ),
              const Text("MindConnect", style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(width: 48),
            ],
          ),
          const SizedBox(height: 20),
          
          // Greeting
          Text(
            "$greeting!", 
            style: const TextStyle(
              fontSize: 28, 
              fontWeight: FontWeight.bold,
              color: AppColors.textMainLight
            )
          ),
          const SizedBox(height: 8),
          Text(
            t['helpText']!, 
            style: const TextStyle(
              color: AppColors.textSubLight,
              fontSize: 16
            )
          ),
          const SizedBox(height: 32),
          
          // Daily Mood Card
          _buildActionCard(
            title: t['moodCheck']!,
            description: t['moodDesc']!,
            icon: Icons.sentiment_satisfied_alt,
            iconColor: const Color(0xFF5B6CD0), 
            iconBg: const Color(0xFFEEF2FF),    
            onTap: onStartMood,
          ),
          
          const SizedBox(height: 16),
          
          // Wellness Assessment Card
          _buildActionCard(
            title: t['wellnessCheck']!,
            description: t['wellnessDesc']!,
            icon: Icons.psychology,
            iconColor: const Color(0xFF5B6CD0), 
            iconBg: const Color(0xFFEEF2FF),    
            onTap: onStartWellness,
          ),
        ],
      ),
    );
  }

  Widget _buildActionCard({
    required String title, 
    required String description, 
    required IconData icon, 
    required Color iconColor, 
    required Color iconBg, 
    required VoidCallback onTap
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 15,
              offset: const Offset(0, 5),
            )
          ],
          border: Border.all(color: Colors.grey.shade100),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: iconBg, 
                borderRadius: BorderRadius.circular(15),
              ),
              child: Icon(icon, size: 32, color: iconColor),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                      color: AppColors.textMainLight,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    description,
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppColors.textSubLight,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}