from django import template

register = template.Library()

@register.filter
def chinese_full_name(user):
    """
    返回中国人习惯的姓名格式（姓在前，名在后）
    如果用户有real_name字段，直接使用
    否则将first_name和last_name按中国习惯组合
    """
    if hasattr(user, 'real_name') and user.real_name:
        return user.real_name
    
    # 如果没有real_name，尝试组合first_name和last_name
    if user.last_name and user.first_name:
        # 中国习惯：姓 + 名
        return f"{user.last_name}{user.first_name}"
    elif user.last_name:
        return user.last_name
    elif user.first_name:
        return user.first_name
    else:
        return user.username

@register.filter
def chinese_name_initial(user):
    """
    返回中国人姓名的首字符（通常是姓氏）
    """
    full_name = chinese_full_name(user)
    return full_name[0].upper() if full_name else user.username[0].upper()

@register.filter
def get_item(dictionary, key):
    """
    从字典中获取指定键的值
    用法：{{ dict|get_item:key }}
    """
    if dictionary is None:
        return None
    
    # 处理不同类型的键
    if isinstance(dictionary, dict):
        # 尝试直接获取
        if key in dictionary:
            return dictionary[key]
        # 尝试字符串形式的键
        str_key = str(key)
        if str_key in dictionary:
            return dictionary[str_key]
        # 尝试整数形式的键
        try:
            int_key = int(key)
            if int_key in dictionary:
                return dictionary[int_key]
        except (ValueError, TypeError):
            pass
    
    return None

@register.filter
def chinese_name(question_type):
    """
    将英文题目类型转换为中文名称
    """
    type_mapping = {
        'single_choice': '单选题',
        'multiple_choice': '多选题',
        'short_answer': '简答题',
        'essay': '论述题',
        'fill_blank': '填空题',
        'true_false': '判断题',
    }
    return type_mapping.get(question_type, question_type)

@register.filter
def add(value, arg):
    """
    数字相加过滤器
    """
    try:
        return int(value) + int(arg)
    except (ValueError, TypeError):
        return value

@register.filter
def to_chr(value):
    """
    将数字转换为对应的ASCII字符
    """
    try:
        import builtins
        return builtins.chr(int(value))
    except (ValueError, TypeError):
        return value

@register.filter
def split(value, delimiter=","):
    """
    字符串分割过滤器
    用法：{{ string|split:"," }}
    """
    if value is None:
        return []
    return str(value).split(delimiter)

@register.filter
def clean_multiple_choice(value):
    """
    清理多选题答案，移除空值和None
    用法：{{ answer|clean_multiple_choice }}
    """
    if not value:
        return []
    
    choices = str(value).split(',')
    # 清理每个选项，移除空格和无效值
    cleaned_choices = []
    for choice in choices:
        choice = choice.strip()
        # 移除各种无效值
        if (choice and 
            choice != 'None' and 
            choice != 'null' and 
            choice != '' and 
            choice != '.' and
            choice != '. None' and
            not choice.startswith('. ')):
            cleaned_choices.append(choice)
    
    return cleaned_choices