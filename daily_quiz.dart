import 'package:flutter/material.dart';
import 'config.dart';

class DailyMoodQuiz extends StatefulWidget {
  final String lang;
  final Function(String, int) onComplete;
  
  const DailyMoodQuiz({
    super.key, 
    required this.lang, 
    required this.onComplete
  });

  @override
  State<DailyMoodQuiz> createState() => _DailyMoodQuizState();
}

class _DailyMoodQuizState extends State<DailyMoodQuiz> {
  int _qIndex = 0;
  int _score = 0;
  bool _finished = false;

  final Map<String, List<Map<String, dynamic>>> questions = {
    'en': [
      {'q': "How are you feeling right now?", 'options': [{'text': "Happy", 'score': 5}, {'text': "Okay", 'score': 3}, {'text': "Sad", 'score': 1}]},
      {'q': "How well did you sleep?", 'options': [{'text': "Great", 'score': 5}, {'text': "Okay", 'score': 3}, {'text': "Poorly", 'score': 1}]},
      {'q': "Are you motivated today?", 'options': [{'text': "Yes!", 'score': 5}, {'text': "A bit", 'score': 3}, {'text': "No", 'score': 1}]}
    ],
    'hi': [
      {'q': "आप अभी कैसा महसूस कर रहे हैं?", 'options': [{'text': "खुश", 'score': 5}, {'text': "ठीक", 'score': 3}, {'text': "उदास", 'score': 1}]},
      {'q': "कल रात आप कैसे सोए?", 'options': [{'text': "बहुत अच्छा", 'score': 5}, {'text': "ठीक", 'score': 3}, {'text': "खराब", 'score': 1}]},
      {'q': "क्या आप आज प्रेरित महसूस कर रहे हैं?", 'options': [{'text': "हाँ!", 'score': 5}, {'text': "थोड़ा", 'score': 3}, {'text': "नहीं", 'score': 1}]}
    ]
  };

  void _answer(int score) {
    _score += score;
    var qs = questions[widget.lang] ?? questions['en']!;
    
    if (_qIndex < qs.length - 1) {
      setState(() => _qIndex++);
    } else {
      String result;
      if (_score >= 12) result = "Feeling Great! 🌟";
      else if (_score >= 8) result = "Feeling Okay 🙂";
      else result = "Feeling Down 😔";

      widget.onComplete(result, _score);
      setState(() => _finished = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_finished) {
      return Scaffold(
        appBar: AppBar(title: const Text("Results"), centerTitle: true),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.check_circle, color: Colors.green, size: 100),
              const SizedBox(height: 24),
              Text(
                _score >= 12 ? "Feeling Great! 🌟" 
                : _score >= 8 ? "Feeling Okay 🙂" 
                : "Feeling Down 😔", 
                style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              Text("Score: $_score / 15", style: const TextStyle(fontSize: 18, color: Colors.grey)),
              const SizedBox(height: 48),
              ElevatedButton(
                onPressed: () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30))
                ),
                child: const Text("Back to Home", style: TextStyle(fontSize: 16)),
              )
            ],
          ),
        ),
      );
    }

    var qs = questions[widget.lang] ?? questions['en']!;
    var q = qs[_qIndex];
    double progress = (_qIndex + 1) / qs.length;

    return Scaffold(
      appBar: AppBar(title: Text("Question ${_qIndex + 1}/${qs.length}")),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            LinearProgressIndicator(
              value: progress, 
              color: AppColors.primary, 
              backgroundColor: Colors.grey.shade200,
              minHeight: 8,
              borderRadius: BorderRadius.circular(10),
            ),
            const SizedBox(height: 32),
            Text(
              q['q'], 
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.textMainLight)
            ),
            const SizedBox(height: 40),
            ...q['options'].map<Widget>((o) => Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: ElevatedButton(
                onPressed: () => _answer(o['score']),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: AppColors.textMainLight,
                  elevation: 0,
                  side: BorderSide(color: Colors.grey.shade200),
                  padding: const EdgeInsets.symmetric(vertical: 20),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  alignment: Alignment.centerLeft,
                ),
                child: Padding(
                  padding: const EdgeInsets.only(left: 20),
                  child: Text(o['text'], style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
                ),
              ),
            )).toList(),
          ],
        ),
      ),
    );
  }
}