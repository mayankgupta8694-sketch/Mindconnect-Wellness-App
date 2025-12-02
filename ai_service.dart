import 'dart:convert';
import 'package:http/http.dart' as http;
import 'config.dart';

Future<String> fetchAIResponse(String userMessage, List<Map<String, dynamic>> chatHistory) async {
  if (apiKey.isEmpty) return "Error: API Key is missing.";
  try {
    String historyText = chatHistory.map((m) => "${m['isMe'] ? 'User' : 'AI'}: ${m['text']}").join('\n');
    final response = await http.post(
      Uri.parse('$apiUrl?key=$apiKey'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        "contents": [{ "parts": [{ "text": "You are a helpful mental wellness companion. Keep it short.\n\n$historyText\nUser: $userMessage" }] }]
      }),
    );
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['candidates'][0]['content']['parts'][0]['text'];
    }
    return "Connection error (Status: ${response.statusCode})";
  } catch (e) {
    return "Connection error.";
  }
}

Future<Map<String, dynamic>> fetchWellnessRecommendations(String ageGroup, int score, int maxScore) async {
  final fallback = {
    'personality': "The Resilient Spirit",
    'groups': ["Calm Minds Circle", "Motivation Builders"],
    'movies': ["Inside Out", "The Pursuit of Happyness"],
    'books': ["Atomic Habits", "The Alchemist"]
  };

  if (apiKey.isEmpty) return fallback;

  final prompt = """
    Analyze a $ageGroup user with a wellness score of $score/$maxScore.
    Return ONLY a JSON object with: personality (string), groups (list of strings), movies (list of strings), books (list of strings).
    Pick groups from: "Calm Minds Circle", "Healing Hearts Haven", "Motivation Builders", "Self Discovery Hub", "Empathetic Listeners", "Creative Copers".
  """;

  try {
    final response = await http.post(
      Uri.parse('$apiUrl?key=$apiKey'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({ "contents": [{ "parts": [{ "text": prompt }] }] }),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      String text = data['candidates'][0]['content']['parts'][0]['text'];
      text = text.replaceAll('```json', '').replaceAll('```', '').trim();
      return jsonDecode(text);
    }
  } catch (e) {
    print("AI Error: $e");
  }
  return fallback;
}