import 'package:flutter/material.dart';
import 'config.dart';
import 'ai_service.dart';

class WellnessAssessment extends StatefulWidget {
  final String lang;
  final Function(String, int) onComplete;
  const WellnessAssessment({super.key, required this.lang, required this.onComplete});

  @override
  State<WellnessAssessment> createState() => _WellnessAssessmentState();
}

class _WellnessAssessmentState extends State<WellnessAssessment> {
  int _step = 0; // 0=Age Select, 1=Quiz, 2=Result
  String? _age;
  int _qIndex = 0;
  int _score = 0;
  bool _loading = false;
  Map<String, dynamic>? _aiResults;

  // 10 Questions for each age group
  final Map<String, Map<String, List<Map<String, dynamic>>>> allQuestions = {
    'en': {
      'teen': [
        {'q': "Overwhelmed by school?", 'options': [{'text': "Rarely", 's': 1}, {'text': "Sometimes", 's': 3}, {'text': "Often", 's': 5}]},
        {'q': "Sleep quality?", 'options': [{'text': "Good", 's': 1}, {'text': "Mixed", 's': 3}, {'text': "Bad", 's': 5}]},
        {'q': "Comfortable talking to adults?", 'options': [{'text': "Yes", 's': 1}, {'text': "Sometimes", 's': 3}, {'text': "No", 's': 5}]},
        {'q': "Social media comparison?", 'options': [{'text': "Rarely", 's': 1}, {'text': "Sometimes", 's': 3}, {'text': "Often", 's': 5}]},
        {'q': "General mood?", 'options': [{'text': "Positive", 's': 1}, {'text': "Mixed", 's': 3}, {'text': "Low", 's': 5}]},
        {'q': "Bouncing back from failure?", 'options': [{'text': "Easy", 's': 1}, {'text': "Hard", 's': 3}, {'text': "Very Hard", 's': 5}]},
        {'q': "Friendship satisfaction?", 'options': [{'text': "High", 's': 1}, {'text': "Okay", 's': 3}, {'text': "Low", 's': 5}]},
        {'q': "Future worry?", 'options': [{'text': "Rarely", 's': 1}, {'text': "Sometimes", 's': 3}, {'text': "Always", 's': 5}]},
        {'q': "Healthy coping?", 'options': [{'text': "Yes", 's': 1}, {'text': "Sometimes", 's': 3}, {'text': "No", 's': 5}]},
        {'q': "Feeling understood?", 'options': [{'text': "Yes", 's': 1}, {'text': "Sort of", 's': 3}, {'text': "No", 's': 5}]},
      ],
      'adult': [
         {'q': "Work-life balance?", 'options': [{'text': "Good", 's': 1}, {'text': "Okay", 's': 3}, {'text': "Poor", 's': 5}]},
         {'q': "Irritability levels?", 'options': [{'text': "Low", 's': 1}, {'text': "Medium", 's': 3}, {'text': "High", 's': 5}]},
         {'q': "Time for hobbies?", 'options': [{'text': "Plenty", 's': 1}, {'text': "Some", 's': 3}, {'text': "None", 's': 5}]},
         {'q': "Financial stress?", 'options': [{'text': "Low", 's': 1}, {'text': "Medium", 's': 3}, {'text': "High", 's': 5}]},
         {'q': "Wake up refreshed?", 'options': [{'text': "Yes", 's': 1}, {'text': "Sometimes", 's': 3}, {'text': "No", 's': 5}]},
         {'q': "Conflict handling?", 'options': [{'text': "Calm", 's': 1}, {'text': "Defensive", 's': 3}, {'text': "Angry", 's': 5}]},
         {'q': "Substance use for stress?", 'options': [{'text': "Never", 's': 1}, {'text': "Sometimes", 's': 3}, {'text': "Often", 's': 5}]},
         {'q': "Focus and concentration?", 'options': [{'text': "Good", 's': 1}, {'text': "Okay", 's': 3}, {'text': "Poor", 's': 5}]},
         {'q': "Sense of purpose?", 'options': [{'text': "Strong", 's': 1}, {'text': "Okay", 's': 3}, {'text': "Weak", 's': 5}]},
         {'q': "Reaction to small problems?", 'options': [{'text': "Calm", 's': 1}, {'text': "Annoyed", 's': 3}, {'text': "Overwhelmed", 's': 5}]},
      ],
       'elder': [
         {'q': "Social interaction?", 'options': [{'text': "Good", 's': 1}, {'text': "Okay", 's': 3}, {'text': "Poor", 's': 5}]},
         {'q': "Physical comfort?", 'options': [{'text': "Good", 's': 1}, {'text': "Okay", 's': 3}, {'text': "Poor", 's': 5}]},
         {'q': "Optimism?", 'options': [{'text': "High", 's': 1}, {'text': "Medium", 's': 3}, {'text': "Low", 's': 5}]},
         {'q': "Family connection?", 'options': [{'text': "Strong", 's': 1}, {'text': "Okay", 's': 3}, {'text': "Weak", 's': 5}]},
         {'q': "Adapting to change?", 'options': [{'text': "Easy", 's': 1}, {'text': "Okay", 's': 3}, {'text': "Hard", 's': 5}]},
         {'q': "Energy levels?", 'options': [{'text': "Good", 's': 1}, {'text': "Okay", 's': 3}, {'text': "Low", 's': 5}]},
         {'q': "Mental stimulation?", 'options': [{'text': "High", 's': 1}, {'text': "Medium", 's': 3}, {'text': "Low", 's': 5}]},
         {'q': "Accepting help?", 'options': [{'text': "Easy", 's': 1}, {'text': "Okay", 's': 3}, {'text': "Hard", 's': 5}]},
         {'q': "Life reflection?", 'options': [{'text': "Positive", 's': 1}, {'text': "Mixed", 's': 3}, {'text': "Negative", 's': 5}]},
         {'q': "Independence?", 'options': [{'text': "Secure", 's': 1}, {'text': "Worried", 's': 3}, {'text': "Insecure", 's': 5}]},
      ]
    }
  };

  void _answer(int s) async {
    _score += s;
    var qs = allQuestions['en']![_age?.toLowerCase() ?? 'adult']!;
    
    if (_qIndex < qs.length - 1) {
      setState(() => _qIndex++);
    } else {
      setState(() => _loading = true);
      
      // --- AI CALL ---
      _aiResults = await fetchWellnessRecommendations(_age!, _score, qs.length * 5);
      
      widget.onComplete("Wellness Score: $_score", _score);
      setState(() { _loading = false; _step = 2; });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(color: AppColors.primary),
              SizedBox(height: 20),
              Text("Analyzing Wellness Profile...")
            ],
          )
        )
      );
    }

    // Step 0: Age Selection
    if (_step == 0) {
      return Scaffold(
        appBar: AppBar(title: const Text("Select Age Group")),
        body: ListView(
          padding: const EdgeInsets.all(20),
          children: ['Teen', 'Adult', 'Elder'].map((age) => Card(
            margin: const EdgeInsets.only(bottom: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: ListTile(
              contentPadding: const EdgeInsets.all(16),
              leading: const Icon(Icons.person_outline, size: 30, color: AppColors.primary),
              title: Text(age, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => setState(() { _age = age; _step = 1; }),
            ),
          )).toList(),
        ),
      );
    }

    // Step 2: Results Screen
    if (_step == 2) {
      return Scaffold(
        appBar: AppBar(title: const Text("Your Insights")),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              const Icon(Icons.check_circle, color: Colors.green, size: 80),
              const SizedBox(height: 20),
              Text("Assessment Complete", style: Theme.of(context).textTheme.headlineMedium),
              Text("Score: $_score", style: TextStyle(fontSize: 18, color: AppColors.primary)),
              const SizedBox(height: 30),
              
              if (_aiResults != null) Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10)]
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text("AI Analysis", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppColors.primary)),
                    const Divider(height: 30),
                    
                    _buildResultItem("Personality", _aiResults!['personality']),
                    _buildResultItem("Recommended Groups", (_aiResults!['groups'] as List).join(", ")),
                    _buildResultItem("Movies for You", (_aiResults!['movies'] as List).join(", ")),
                    _buildResultItem("Books to Read", (_aiResults!['books'] as List).join(", ")),
                  ],
                ),
              ),
              
              const SizedBox(height: 40),
              ElevatedButton(
                onPressed: () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(minimumSize: const Size(double.infinity, 50), backgroundColor: AppColors.primary, foregroundColor: Colors.white),
                child: const Text("Back to Home"),
              ),
            ],
          ),
        ),
      );
    }

    // Step 1: Quiz UI
    var qs = allQuestions['en']![_age?.toLowerCase() ?? 'adult']!;
    if (qs.isEmpty) return const Scaffold(body: Center(child: Text("No questions found.")));
    var q = qs[_qIndex];

    return Scaffold(
      appBar: AppBar(title: Text("Question ${_qIndex + 1}/${qs.length}")),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            LinearProgressIndicator(value: (_qIndex + 1) / qs.length, color: AppColors.primary, borderRadius: BorderRadius.circular(10), minHeight: 8),
            const SizedBox(height: 32),
            Text(q['q'], style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 40),
            ...q['options'].map<Widget>((o) => Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: ElevatedButton(
                onPressed: () => _answer(o['s']),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: Colors.black87,
                  padding: const EdgeInsets.symmetric(vertical: 20),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  side: BorderSide(color: Colors.grey.shade200),
                  alignment: Alignment.centerLeft
                ),
                child: Padding(
                  padding: const EdgeInsets.only(left: 16),
                  child: Text(o['text'], style: const TextStyle(fontSize: 16)),
                ),
              ),
            )).toList(),
          ],
        ),
      ),
    );
  }

  Widget _buildResultItem(String title, String content) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 14, color: Colors.grey, fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          Text(content, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }
}