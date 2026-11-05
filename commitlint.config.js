module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // Tính năng mới
        'fix',      // Sửa lỗi
        'docs',     // Thêm tài liệu
        'style',    // Format code
        'refactor', // Tối ưu code
        'test',     // Viết test
        'chore',    // Cập nhật linh tinh (build, cấu hình...)
      ],
    ],
  },
};