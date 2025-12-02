import 'package:flutter/material.dart';

// ⚠️ PASTE YOUR API KEY HERE
const String apiKey = "AIzaSyBfUGHiiODGq8AUeliPEeQnf0WEFssb0kM"; 
const String apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent';

// This class DEFINES the colors for the whole app
class AppColors {
  static const Color primary = Color(0xFF5B6CD0);
  static const Color secondary = Color(0xFFF7A659);
  static const Color backgroundLight = Color(0xFFF4F7FC);
  static const Color backgroundDark = Color(0xFF111827);
  static const Color cardLight = Colors.white;
  static const Color cardDark = Color(0xFF1F2937);
  static const Color textMainLight = Color(0xFF1F2937);
  static const Color textMainDark = Color(0xFFF9FAFB);
  static const Color textSubLight = Color(0xFF6B7280);
  static const Color textSubDark = Color(0xFF9CA3AF);
}

// This map DEFINES the translations
const Map<String, Map<String, String>> translations = {
  'en': {
    'greetingMorning': "Good Morning",
    'greetingAfternoon': "Good Afternoon",
    'greetingEvening': "Good Evening",
    'helpText': "How can we help you today?",
    'moodCheck': "Daily Mood Check-in",
    'moodDesc': "Log your mood in 30 seconds.",
    'wellnessCheck': "Wellness Assessment",
    'wellnessDesc': "Take the full 10-question check.",
    'home': "Home", 'history': "History", 'groups': "Groups", 
    'profile': "Profile", 'settings': "Settings", 'logout': "Log Out",
    'journal': "Journal", 'resources': "Resources", 'yoga': "Yoga Therapy", 'books': "Books",
    'reset': "Reset Data", 'aiTitle': "Mindful Companion", 'aiWelcome': "Hi! How are you feeling?"
  },
  'hi': {
    'greetingMorning': "शुभ प्रभात",
    'greetingAfternoon': "शुभ दोपहर",
    'greetingEvening': "शुभ संध्या",
    'helpText': "आज हम आपकी कैसे मदद कर सकते हैं?",
    'moodCheck': "दैनिक मूड चेक-इन",
    'moodDesc': "30 सेकंड में अपना मूड लॉग करें।",
    'wellnessCheck': "कल्याण मूल्यांकन",
    'wellnessDesc': "पूरा मूल्यांकन करें।",
    'home': "होम", 'history': "इतिहास", 'groups': "समूह",
    'profile': "प्रोफाइल", 'settings': "सेटिंग्स", 'logout': "लॉग आउट",
    'journal': "पत्रिका", 'resources': "संसाधन", 'yoga': "योग", 'books': "किताबें",
    'reset': "रीसेट", 'aiTitle': "माइंडफुल साथी", 'aiWelcome': "नमस्ते! आप कैसे हैं?"
  }
};