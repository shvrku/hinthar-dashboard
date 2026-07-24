# Walkthrough - School Code Requirement & API Validation

We have implemented strict choice validation and API requirement for `school_code` across the `people` app (`Student`, `Teacher`, `Staff`).

---

## 1. Summary of Changes

### Models (`people/models.py`)
- Defined `SCHOOL_CHOICES`:
  ```python
  SCHOOL_CHOICES = [
      ('HIS', 'HIS'),
      ('SPD', 'SPD'),
      ('SPN', 'SPN'),
      ('YWM', 'YWM'),
  ]
  ```
- Configured `school_code` on `Student`, `Teacher`, and `Staff` models with `choices=SCHOOL_CHOICES`.

### Serializers (`people/serializers.py`)
- Updated `StudentSerializer`, `TeacherSerializer`, and `StaffSerializer` to include:
  ```python
  school_code = serializers.ChoiceField(choices=SCHOOL_CHOICES, required=True)
  ```
- **Behavior**:
  - API POST calls to create a student/teacher/staff **must** supply `school_code`.
  - Only allowed values (`HIS`, `SPD`, `SPN`, `YWM`) are accepted; invalid codes return HTTP `400 Bad Request`.

### Database Migration (`people/migrations/0010_...`)
- Created migration `0010_alter_staff_school_code_alter_student_school_code_and_more.py` updating model field choices.

---

## 2. Verification

All 23 tests in the `people` test suite executed successfully:

```
Found 23 test(s).
System check identified no issues (0 silenced).
.......................
----------------------------------------------------------------------
Ran 23 tests in 24.488s

OK
```

### New Tests Added (`people/tests.py`)
- `test_valid_school_codes_pass_validation`: Verifies `HIS`, `SPD`, `SPN`, `YWM` are all accepted.
- `test_invalid_school_code_fails_validation`: Verifies unknown codes like `INVALID` are rejected.
- `test_missing_school_code_fails_validation`: Verifies omitting `school_code` on POST triggers a `400 Bad Request` validation error.
