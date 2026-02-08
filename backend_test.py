import requests
import sys
import json
from datetime import datetime

class LessonPlanAPITester:
    def __init__(self, base_url="https://eduplan-genius-2.preview.emergentagent.com"):
        self.base_url = base_url
        self.teacher_token = None
        self.admin_token = None
        self.test_user_id = None
        self.test_lesson_plan_id = None
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_teacher_registration(self):
        """Test teacher registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        test_data = {
            "email": f"teacher_{timestamp}@test.com",
            "password": "TestPass123!",
            "full_name": f"Test Teacher {timestamp}",
            "state": "CA"
        }
        
        success, response = self.run_test(
            "Teacher Registration",
            "POST",
            "auth/register",
            200,
            data=test_data
        )
        
        if success and 'token' in response:
            self.teacher_token = response['token']
            self.test_user_id = response['user']['id']
            print(f"   Teacher registered with ID: {self.test_user_id}")
            print(f"   Join code: {response['user'].get('join_code')}")
            return True
        return False

    def test_teacher_login(self):
        """Test teacher login with existing credentials"""
        test_data = {
            "email": "teacher_123456@test.com",  # Use a known email or create one
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            "Teacher Login",
            "POST",
            "auth/login",
            200,
            data=test_data
        )
        
        if success and 'token' in response:
            self.teacher_token = response['token']
            return True
        return False

    def test_admin_login(self):
        """Test admin login"""
        test_data = {
            "email": "admin@lessonplan.ai",
            "password": "admin123"
        }
        
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data=test_data
        )
        
        if success and 'token' in response:
            self.admin_token = response['token']
            print(f"   Admin logged in successfully")
            return True
        return False

    def test_get_current_user(self):
        """Test getting current user info"""
        if not self.teacher_token:
            print("❌ No teacher token available for user info test")
            return False
            
        headers = {'Authorization': f'Bearer {self.teacher_token}'}
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200,
            headers=headers
        )
        return success

    def test_create_lesson_plan(self):
        """Test creating a lesson plan"""
        if not self.teacher_token:
            print("❌ No teacher token available for lesson plan creation")
            return False
            
        test_data = {
            "textbook": "Algebra 1, Chapter 5 - Linear Equations",
            "start_date": "2025-01-15",
            "end_date": "2025-01-25",
            "lesson_range": "Lessons 1-5",
            "next_major_assessment": "2025-01-30"
        }
        
        headers = {'Authorization': f'Bearer {self.teacher_token}'}
        success, response = self.run_test(
            "Create Lesson Plan",
            "POST",
            "lesson-plans",
            200,
            data=test_data,
            headers=headers
        )
        
        if success and 'id' in response:
            self.test_lesson_plan_id = response['id']
            print(f"   Lesson plan created with ID: {self.test_lesson_plan_id}")
            return True
        return False

    def test_get_lesson_plans(self):
        """Test getting all lesson plans for user"""
        if not self.teacher_token:
            print("❌ No teacher token available for getting lesson plans")
            return False
            
        headers = {'Authorization': f'Bearer {self.teacher_token}'}
        success, response = self.run_test(
            "Get Lesson Plans",
            "GET",
            "lesson-plans",
            200,
            headers=headers
        )
        
        if success:
            print(f"   Found {len(response)} lesson plans")
        return success

    def test_get_single_lesson_plan(self):
        """Test getting a single lesson plan"""
        if not self.teacher_token or not self.test_lesson_plan_id:
            print("❌ No teacher token or lesson plan ID available")
            return False
            
        headers = {'Authorization': f'Bearer {self.teacher_token}'}
        success, response = self.run_test(
            "Get Single Lesson Plan",
            "GET",
            f"lesson-plans/{self.test_lesson_plan_id}",
            200,
            headers=headers
        )
        return success

    def test_export_lesson_plan(self):
        """Test exporting lesson plan to DOCX"""
        if not self.teacher_token or not self.test_lesson_plan_id:
            print("❌ No teacher token or lesson plan ID available")
            return False
            
        url = f"{self.base_url}/api/lesson-plans/{self.test_lesson_plan_id}/export"
        headers = {'Authorization': f'Bearer {self.teacher_token}'}
        
        self.tests_run += 1
        print(f"\n🔍 Testing Export Lesson Plan...")
        
        try:
            response = requests.get(url, headers=headers)
            success = response.status_code == 200
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                print(f"   Content-Type: {response.headers.get('content-type')}")
                print(f"   Content-Length: {len(response.content)} bytes")
                return True
            else:
                print(f"❌ Failed - Expected 200, got {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False

    def test_admin_stats(self):
        """Test admin stats endpoint"""
        if not self.admin_token:
            print("❌ No admin token available for stats test")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        success, response = self.run_test(
            "Admin Stats",
            "GET",
            "admin/stats",
            200,
            headers=headers
        )
        
        if success:
            print(f"   Total users: {response.get('total_users')}")
            print(f"   Active users: {response.get('active_users')}")
            print(f"   Total lesson plans: {response.get('total_lesson_plans')}")
        return success

    def test_admin_users(self):
        """Test admin users endpoint"""
        if not self.admin_token:
            print("❌ No admin token available for users test")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        success, response = self.run_test(
            "Admin Users",
            "GET",
            "admin/users",
            200,
            headers=headers
        )
        
        if success:
            print(f"   Found {len(response)} users")
        return success

    def test_admin_user_activation(self):
        """Test admin user activation/deactivation"""
        if not self.admin_token or not self.test_user_id:
            print("❌ No admin token or test user ID available")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Test deactivation
        success1, _ = self.run_test(
            "Admin Deactivate User",
            "POST",
            f"admin/users/{self.test_user_id}/deactivate",
            200,
            headers=headers
        )
        
        # Test activation
        success2, _ = self.run_test(
            "Admin Activate User",
            "POST",
            f"admin/users/{self.test_user_id}/activate",
            200,
            headers=headers
        )
        
        return success1 and success2

    def test_delete_lesson_plan(self):
        """Test deleting a lesson plan"""
        if not self.teacher_token or not self.test_lesson_plan_id:
            print("❌ No teacher token or lesson plan ID available")
            return False
            
        headers = {'Authorization': f'Bearer {self.teacher_token}'}
        success, response = self.run_test(
            "Delete Lesson Plan",
            "DELETE",
            f"lesson-plans/{self.test_lesson_plan_id}",
            200,
            headers=headers
        )
        return success

def main():
    print("🚀 Starting LessonPlan AI Backend API Tests")
    print("=" * 60)
    
    tester = LessonPlanAPITester()
    
    # Test sequence
    tests = [
        ("Teacher Registration", tester.test_teacher_registration),
        ("Get Current User", tester.test_get_current_user),
        ("Admin Login", tester.test_admin_login),
        ("Create Lesson Plan", tester.test_create_lesson_plan),
        ("Get Lesson Plans", tester.test_get_lesson_plans),
        ("Get Single Lesson Plan", tester.test_get_single_lesson_plan),
        ("Export Lesson Plan", tester.test_export_lesson_plan),
        ("Admin Stats", tester.test_admin_stats),
        ("Admin Users", tester.test_admin_users),
        ("Admin User Activation", tester.test_admin_user_activation),
        ("Delete Lesson Plan", tester.test_delete_lesson_plan),
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        try:
            if not test_func():
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {str(e)}")
            failed_tests.append(test_name)
    
    # Print results
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if failed_tests:
        print(f"\n❌ Failed tests:")
        for test in failed_tests:
            print(f"   - {test}")
    else:
        print("\n✅ All tests passed!")
    
    print("\n🔍 Key Features Tested:")
    print("   - Teacher registration with auto-generated join codes")
    print("   - JWT authentication")
    print("   - AI lesson plan generation")
    print("   - Lesson plan CRUD operations")
    print("   - DOCX export functionality")
    print("   - Admin dashboard and user management")
    
    return 0 if len(failed_tests) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())