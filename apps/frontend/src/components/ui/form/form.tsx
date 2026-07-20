import clsx from 'clsx';
import { FieldErrors, FieldValues, FormProvider } from 'react-hook-form';

const Form = FormProvider;

export default Form;

export function FormWrapper({ errors, children, className, ...props }: { errors: FieldErrors<FieldValues> } & React.ComponentProps<'form'>) {
  const isValidated = !!Object.keys(errors).length;

  return (
    <form noValidate className={clsx(isValidated && 'form-validated', className)} {...props}>
      {children}
    </form>
  );
}
