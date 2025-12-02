import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

// Import the separate files
import 'config.dart';
import 'ai_service.dart';
import 'dashboard.dart';
import 'chatbot.dart';
import 'daily_quiz.dart';
import 'wellness_assessment.dart';

void main() {
  runApp(const MindConnectApp());
}

class MindConnectApp extends StatelessWidget {
  const MindConnectApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MindConnect',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppColors.primary,
          brightness: Brightness.light,
        ),
        scaffoldBackgroundColor: AppColors.backgroundLight,
        fontFamily: 'Roboto', 
      ),
      home: const MainContainer(),
    );
  }
}

class MainContainer extends StatefulWidget {
  const MainContainer({super.key});

  @override
  State<MainContainer> createState() => _MainContainerState();
}

class _MainContainerState extends State<MainContainer> {
  int _selectedIndex = 0;
  
  // --- THIS IS THE MISSING LINE YOU NEED ---
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  
  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  void _startMoodQuiz() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => DailyMoodQuiz(
          lang: 'en', 
          onComplete: (result, score) {
            print("Mood Result: $result"); 
          },
        )
      ),
    );
  }

  void _startWellness() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => WellnessAssessment(
          lang: 'en',
          onComplete: (result, score) {
            print("Wellness Result: $result");
          },
        )
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final List<Widget> pages = [
      HomeScreen(
        lang: 'en',
        onStartMood: _startMoodQuiz,
        onStartWellness: _startWellness,
        onMenuTap: () {
          _scaffoldKey.currentState?.openDrawer();
        },
      ),
      const Center(child: Text("History Page (Coming Soon)")),
      const Center(child: Text("Community Groups (Coming Soon)")),
    ];

    return Scaffold(
      key: _scaffoldKey, // This connects the key to the screen
      drawer: Drawer(
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            const DrawerHeader(
              decoration: BoxDecoration(color: AppColors.primary),
              child: Text('Menu', style: TextStyle(color: Colors.white, fontSize: 24)),
            ),
            ListTile(title: const Text('Profile'), onTap: () {}),
            ListTile(title: const Text('Settings'), onTap: () {}),
            ListTile(title: const Text('Log Out'), onTap: () {}),
          ],
        ),
      ),
      body: SafeArea(child: pages[_selectedIndex]),
      bottomNavigationBar: BottomNavigationBar(
        items: const <BottomNavigationBarItem>[
          BottomNavigationBarItem(icon: Icon(Icons.home_outlined), activeIcon: Icon(Icons.home), label: 'Home'),
          BottomNavigationBarItem(icon: Icon(Icons.history), label: 'History'),
          BottomNavigationBarItem(icon: Icon(Icons.group_outlined), activeIcon: Icon(Icons.group), label: 'Groups'),
        ],
        currentIndex: _selectedIndex,
        selectedItemColor: AppColors.primary,
        onTap: _onItemTapped,
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => const AIChatPage(lang: 'en')),
          );
        },
        backgroundColor: AppColors.primary,
        child: const Icon(Icons.auto_awesome, color: Colors.white),
      ),
    );
  }
}