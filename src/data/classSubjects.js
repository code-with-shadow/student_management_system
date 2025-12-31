// Mapping of class -> subjects
// Keys are class numbers as strings (e.g. '6')
// Values are arrays of subject names

const classSubjects = {
  '5': ['Bangla', 'English', 'Math', 'Science', 'Social Studies', 'Religion'],
  '6': ['Bangla', 'English', 'Math', 'Science', 'Social Studies', 'Religion'],
  '7': ['Bangla', 'English', 'Math', 'Science', 'Geography', 'Religion'],
  '8': ['Bangla', 'English', 'Math', 'Science', 'Computer', 'Religion'],
  '9': ['Bangla', 'English', 'Math', 'Physics', 'Chemistry', 'Biology'],
  '10': ['Bangla', 'English', 'Math', 'Physics', 'Chemistry', 'Biology'],
  '11': ['Bangla', 'English', 'Higher Mathematics', 'Physics', 'Chemistry', 'Biology'],
  '12': ['Bangla', 'English', 'Higher Mathematics', 'Physics', 'Chemistry', 'Biology'],
}

export function getSubjectsForClass(classId) {
  return classSubjects[String(classId)] || [];
}

export default classSubjects;
