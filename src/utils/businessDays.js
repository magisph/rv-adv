import { addDays, isSaturday, isSunday, format } from 'date-fns';

/**
 * Adiciona dias úteis a uma data inicial, desconsiderando Sábados, Domingos e feriados (CPC).
 * 
 * @param {Date} startDate - Data de início (o prazo começa a contar a partir do dia seguinte)
 * @param {number} daysToAdd - Quantidade de dias úteis a adicionar
 * @param {Array<string>} holidaysArray - Array de datas de feriados no formato YYYY-MM-DD
 * @returns {Date} - Data final calculada
 */
export function addBusinessDays(startDate, daysToAdd, holidaysArray = []) {
  let currentDate = startDate;
  let remainingDays = daysToAdd;

  while (remainingDays > 0) {
    // Itera para o próximo dia
    currentDate = addDays(currentDate, 1);
    
    const isWeekend = isSaturday(currentDate) || isSunday(currentDate);
    const dateFormatted = format(currentDate, 'yyyy-MM-dd');
    const isHoliday = holidaysArray.includes(dateFormatted);

    // Só decrementa do prazo se for dia útil e não for feriado
    if (!isWeekend && !isHoliday) {
      remainingDays--;
    }
  }

  return currentDate;
}
